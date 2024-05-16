import {expandPath, extractExif} from '../utils.js'
import {access, stat, unlink} from 'node:fs/promises'
import {constants} from 'node:fs'
import {DatabaseService} from './DatabaseService.js'
import * as nodePath from 'node:path'
import {HashingAlgorithmType, HashingService} from './HashingService.js'
import {DuplicateFinderService} from './DuplicateFinderService.js'
import {Logger} from './LoggerService.js'
import {IndexedFile, IndexedFileWithHashes} from '../drizzle/schema.js'
import {walkDirOrFile} from '../walkDirOrFile.js'

type CrawlingOptions = {
  limit?: number
  minutes?: number
  hashingAlgorithms: HashingAlgorithmType[]
  includeExif: boolean
  ignoreFileName?: string
}

type VerifyOptions = {
  limit?: number
  minutes?: number
  hashingAlgorithms: HashingAlgorithmType[]
  purge: boolean
}

type InfoOptions = {
  duplicates: boolean
}

type LookupOptions = {
  remove: boolean
  includeExif: boolean
}

export class IndexerService {
  private readonly databaseService
  private readonly hashingService = new HashingService()
  private readonly duplicateFinder = new DuplicateFinderService()

  private metrics = {
    filesCrawled: 0,
    newFilesIndexed: 0,
    filesHashed: 0,
    hashesComputed: 0,
    startTimeMillis: Date.now(),
  }

  constructor(databasePath: string) {
    this.databaseService = new DatabaseService(databasePath)
  }

  async info(options: InfoOptions): Promise<void> {
    const fileCount = await this.databaseService.countFiles()
    Logger.info(`${fileCount} files indexed`)
    const hashCount = await this.databaseService.countHashes()
    Logger.info(`${hashCount} hashes`)
    const totalSize = await this.databaseService.totalSize()
    Logger.info(`${totalSize} bytes`)

    for await (const algorithm of Object.values(HashingAlgorithmType)) {
      const algoHashCount = await this.databaseService.countHashes(algorithm)
      Logger.info(
        `${algoHashCount} hashes (${algorithm}) - ${Math.round(
          (100 * algoHashCount) / fileCount
        )}%`
      )
    }

    if (options.duplicates) {
      // TODO Rework the duplicate finder.
      const candidates = await this.databaseService.duplicates()
      Logger.debug(`${candidates.length} duplicate candidates`)
      // const duplicates = this.duplicateFinder.getDuplicateGroups(candidates)
      //
      // // Write duplicates to file
      // const data = JSON.stringify(
      //   duplicates.map((group) => group.map((f) => f.path))
      // )
      // await writeFile('./duplicates.json', data, 'utf8')
      //
      // duplicates.map((group) => this.duplicateFinder.debugGroup(group))
    }
  }

  async lookup(path: string, options: LookupOptions): Promise<void> {
    path = expandPath(path)
    Logger.debug(`Lookup ${path}`)

    await walkDirOrFile({
      path,
      options: {
        ignoreFileName: null,
      },
      callback: async (filePath) => {
        Logger.debug(`Looking up ${filePath}`)

        const similarFiles = await this.lookupExistingEntries(filePath)

        if (similarFiles.length > 0) {
          if (similarFiles.some((f) => f.path === filePath)) {
            Logger.info(`🆗 ${filePath}`)
          } else {
            Logger.info(`✅ ${filePath}`)
            if (options.remove) {
              Logger.info(
                `Deleting ${filePath} as similar files were found in the index`
              )
              await unlink(filePath)
            }
          }

          for (const file of similarFiles) {
            Logger.debug(`  ${file.path}`)
          }
        } else {
          Logger.info(`❌ ${filePath}`)
        }

        // Find similar exif date
        const metadata = await this.getFileMetadata({
          filePath,
          includeExif: options.includeExif,
        })
        if (metadata.exifDate) {
          const similarExifDate =
            await this.databaseService.findFilesByExifDate(metadata.exifDate)
          if (similarExifDate.length > 0) {
            Logger.info(`Files with similar exif date`)
            for (const file of similarExifDate) {
              Logger.debug(`  ${file.path}`)
            }
          }
        }

        // Find similar prefix
        const prefixMatch = nodePath
          .basename(filePath)
          .match(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}/)
        if (prefixMatch) {
          const similarPrefix = await this.databaseService.findFilesByPrefix(
            prefixMatch[0]
          )
          if (similarPrefix.length > 0) {
            Logger.info(`Files with similar prefix`)
            for (const file of similarPrefix) {
              Logger.debug(`  ${file.path}`)
            }
          }
        }

        return {stop: false}
      },
    })
  }

  async crawl(path: string, options: CrawlingOptions): Promise<void> {
    path = expandPath(path)
    Logger.debug(`Indexing ${path}`)

    await walkDirOrFile({
      path,
      options: {
        ignoreFileName: options.ignoreFileName ?? null,
      },
      callback: async (filePath) => {
        // Is it already indexed?
        const existingEntry = await this.databaseService.findFile(filePath)

        this.metrics.filesCrawled++

        if (existingEntry) {
          await this.hashFile({
            indexedFile: existingEntry,
            hashingAlgorithms: options.hashingAlgorithms,
          })
          if (options.includeExif) {
            await this.addMissingExifMetadata({indexedFile: existingEntry})
          }
        } else {
          Logger.debug(`Indexing ${filePath}`)

          const metadata = await this.getFileMetadata({
            filePath,
            includeExif: options.includeExif,
          })

          const [fileEntity] = await this.databaseService.createFile(metadata)
          this.metrics.newFilesIndexed++

          await this.hashFile({
            hashingAlgorithms: options.hashingAlgorithms,
            indexedFile: {
              id: fileEntity.id,
              path: fileEntity.path,
              hashes: [],
            },
          })
        }

        const shouldStopForLimit =
          options.limit !== undefined &&
          Math.max(this.metrics.newFilesIndexed, this.metrics.filesHashed) >=
            options.limit

        const shouldStopForTime =
          options.minutes !== undefined &&
          this.elapsedMinutes() > options.minutes

        return {
          stop: shouldStopForLimit || shouldStopForTime,
        }
      },
    })

    Logger.info(
      `${this.metrics.filesCrawled} files crawled. ${this.metrics.newFilesIndexed} newly indexed. ${this.metrics.filesHashed} files hashed.`
    )
  }

  async verify(path: string, options: VerifyOptions): Promise<void> {
    path = expandPath(path)
    Logger.debug(`Verifying ${path}`)

    const fileCount = await this.databaseService.countFilesInPath({path})
    Logger.debug(`${fileCount} indexed files in ${path}`)

    const filesToProcess = options.limit
      ? Math.min(fileCount, options.limit)
      : fileCount

    while (this.metrics.filesCrawled < filesToProcess) {
      // Grab next batch of files
      const files = await this.databaseService.findByValidityInPath({
        path,
        count: Math.min(100, filesToProcess - this.metrics.filesCrawled),
      })

      Logger.debug(`${files.length} files to verify`)

      for (const file of files) {
        await this.verifyFile(file, options)
        this.metrics.filesCrawled++
      }

      // Time limit reached?
      if (
        options.minutes !== undefined &&
        this.elapsedMinutes() > options.minutes
      ) {
        break
      }
    }
  }

  async verifyFile(
    file: IndexedFileWithHashes,
    options: VerifyOptions
  ): Promise<void> {
    Logger.debug(`${this.metrics.filesCrawled} Verifying ${file.path}`)

    try {
      await access(file.path, constants.F_OK)
    } catch {
      Logger.info(`File ${file.path} does not exist anymore`)

      if (options.purge) {
        await this.databaseService.deleteFile({
          indexedFileId: file.id,
        })
      }
      return
    }

    // File still exists, validate the stats
    const metadata = await this.getFileMetadata({
      filePath: file.path,
      includeExif: false,
    })

    if (metadata.size === file.size) {
      if (
        metadata.path === file.path &&
        metadata.basename === file.basename &&
        metadata.extension === file.extension &&
        metadata.mtime === file.mtime &&
        metadata.ctime === file.ctime
      ) {
        await this.databaseService.updateFileValidity({
          indexedFileId: file.id,
        })
      } else {
        Logger.info(
          `Inconsistent metadata for ${file.path}. ${JSON.stringify(
            metadata
          )} vs ${JSON.stringify(file)}`
        )
      }

      for await (const hashingAlgorithm of options.hashingAlgorithms) {
        const existingHash = file.hashes.find(
          (hash) => hash.algorithm === hashingAlgorithm
        )

        if (existingHash) {
          const hashResult = await this.hashingService.hash(
            file.path,
            hashingAlgorithm
          )
          if (hashResult !== null && hashResult.hash === existingHash.value) {
            await this.databaseService.updateHashValidity(
              file.id,
              existingHash.algorithm
            )
          } else {
            Logger.info(
              `Inconsistent hash ${hashingAlgorithm} for ${file.path}. ${hashResult?.hash} vs ${existingHash.value}`
            )
          }
        } else {
          Logger.info(`Missing hash ${hashingAlgorithm} for ${file}`)
        }
      }
    } else {
      Logger.info(
        `${file.path} has a different size. ${metadata.size} vs ${file.size}`
      )
    }
  }

  /**
   * Hashes a file using the provided hashing algorithms if it hasn't been hashed yet.
   */
  private async hashFile({
    indexedFile,
    hashingAlgorithms,
  }: {
    hashingAlgorithms: HashingAlgorithmType[]
    indexedFile: {
      id: string
      path: string
      hashes: {algorithm: HashingAlgorithmType}[]
    }
  }): Promise<void> {
    let hashesComputed = false

    if (hashingAlgorithms.length > 0) {
      for await (const hashingAlgorithm of hashingAlgorithms) {
        if (
          !indexedFile.hashes.some((he) => he.algorithm === hashingAlgorithm)
        ) {
          const result = await this.hashingService.hash(
            indexedFile.path,
            hashingAlgorithm
          )

          if (result === null) {
            Logger.info(
              `Failed to compute hash ${hashingAlgorithm} for ${indexedFile.path}`
            )
            continue
          }

          this.metrics.hashesComputed++
          hashesComputed = true

          await this.databaseService.createHash({
            indexedFileId: indexedFile.id,
            algorithm: hashingAlgorithm,
            version: result.version,
            hash: result.hash,
          })
        }
      }
    }

    if (hashesComputed) {
      this.metrics.filesHashed++
    }
  }

  private async lookupExistingEntries(path: string): Promise<IndexedFile[]> {
    Logger.debug(`Looking up for entries similar to ${path}`)
    const {size} = await this.getFileMetadata({
      filePath: path,
      includeExif: false,
    })

    const existingEntries: IndexedFile[] = []

    const filesWithSameSize = await this.databaseService.findFilesBySize(size)
    Logger.debug(`Found ${filesWithSameSize.length} files with the same size`)

    const hashes: Map<HashingAlgorithmType, string> = new Map()
    const getHash = async (algorithm: HashingAlgorithmType) => {
      if (!hashes.has(algorithm)) {
        const result = await this.hashingService.hash(path, algorithm)
        if (result !== null) {
          hashes.set(algorithm, result.hash)
        }
      }
      return hashes.get(algorithm)
    }

    for (const file of filesWithSameSize) {
      let allHashesMatch = true
      let someHashesMatch = false
      for (const hashEntity of file.hashes) {
        const computedHash = await getHash(hashEntity.algorithm)
        if (computedHash !== hashEntity.value) {
          allHashesMatch = false
          break
        }
        someHashesMatch = true
      }

      // TODO decide if we use allHashesMatch or someHashesMatch
      if (someHashesMatch) {
        existingEntries.push(file)
      }
    }

    return existingEntries
  }

  private async getFileMetadata({
    filePath,
    includeExif,
  }: {
    filePath: string
    includeExif: boolean
  }) {
    const stats = await stat(filePath)

    return {
      path: filePath,
      size: stats.size,
      ctime: stats.ctime,
      mtime: stats.mtime,
      basename: nodePath.basename(filePath),
      extension: nodePath.extname(filePath),
      validatedAt: new Date(),
      ...(includeExif && (await extractExif(filePath))),
    }
  }

  private async addMissingExifMetadata({
    indexedFile,
  }: {
    indexedFile: {
      id: string
      path: string
      width: number | null
    }
  }): Promise<void> {
    if (indexedFile.width === undefined || indexedFile.width === null) {
      await this.databaseService.updateFileExifMetadata({
        indexedFileId: indexedFile.id,
        exifMetadata: await extractExif(indexedFile.path),
      })
    }
  }

  elapsedSeconds(): number {
    const now = Date.now()
    return Math.round((now - this.metrics.startTimeMillis) / 1000)
  }

  elapsedMinutes(): number {
    return Math.floor(this.elapsedSeconds() / 60)
  }
}
