import {expandPath, extractExif} from '../utils.js'
import {access, stat, unlink} from 'node:fs/promises'
import {constants} from 'node:fs'
import {DatabaseService} from './DatabaseService.js'
import * as nodePath from 'node:path'
import {HashingAlgorithmType, HashingService} from './HashingService.js'
import {DuplicateFinderService} from './DuplicateFinderService.js'
import {IndexedFile, IndexedFileWithHashes} from '../drizzle/schema.js'
import {walkDirOrFile} from '../walkDirOrFile.js'
import {formatBytes, formatNumber} from '../utils/Formatter.js'
import {isNullish} from 'remeda'
import {LoggerService} from './LoggerService.js'

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
  removeSimilar: boolean
  includeExif: boolean
}

export class IndexerService {
  private readonly databaseService
  private readonly hashingService = new HashingService()
  private readonly duplicateFinder = new DuplicateFinderService()
  private readonly logger = LoggerService.getLogger()

  private metrics = {
    filesCrawled: 0,
    newFilesIndexed: 0,
    filesHashed: 0,
    hashesComputed: 0,
    exifExtracted: 0,
    startTimeMillis: Date.now(),
  }

  constructor(databasePath: string) {
    this.databaseService = new DatabaseService(databasePath)
  }

  async info(options: InfoOptions): Promise<void> {
    const fileCount = await this.databaseService.countFiles()
    this.logger.info(`${formatNumber(fileCount)} files indexed`)
    const hashCount = await this.databaseService.countHashes()
    this.logger.info(`${formatNumber(hashCount)} hashes`)
    const totalSize = await this.databaseService.totalSize()
    this.logger.info(
      `${formatBytes(totalSize)} - ${formatNumber(totalSize)} bytes`
    )

    for await (const algorithm of Object.values(HashingAlgorithmType)) {
      const algoHashCount = await this.databaseService.countHashes(algorithm)
      this.logger.info(
        `${algoHashCount} hashes (${algorithm}) - ${Math.round(
          (100 * algoHashCount) / fileCount
        )}%`
      )
    }

    if (options.duplicates) {
      // TODO Rework the duplicate finder.
      const candidates = await this.databaseService.duplicates()
      this.logger.debug(`${candidates.length} duplicate candidates`)
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
    this.logger.debug(`Lookup ${path}`)

    await walkDirOrFile({
      path,
      options: {
        ignoreFileName: null,
      },
      callback: async (filePath) => {
        this.logger.info(`Looking up ${filePath}`)

        const {exactHashes, similarityHashes} =
          await this.lookupExistingEntries(filePath)

        let removed = false

        if (exactHashes.length > 0) {
          this.logger.debug(`Files with exact hashes`)
          if (exactHashes.some((f) => f.path === filePath)) {
            this.logger.info(`🆗 ${filePath}`)
          } else {
            this.logger.info(`✅ ${filePath}`)
            if (options.remove) {
              this.logger.info(
                `Deleting ${filePath} as copies were found in the index`
              )
              await unlink(filePath)
              removed = true
            }
          }

          for (const file of exactHashes) {
            this.logger.info(`  ${file.path}`)
          }
        } else {
          this.logger.debug(`❌ Exact - ${filePath}`)
        }

        if (!removed) {
          if (similarityHashes.length > 0) {
            this.logger.debug(`Files with similar hashes`)
            if (similarityHashes.some((f) => f.path === filePath)) {
              this.logger.info(`🆗 ${filePath}`)
            } else {
              this.logger.info(`↕️ ${filePath}`)
              if (options.removeSimilar) {
                this.logger.info(
                  `Deleting ${filePath} as similar files were found in the index`
                )
                await unlink(filePath)
                removed = true
              }
            }

            for (const file of similarityHashes) {
              this.logger.info(`  ${file.path}`)
            }
          } else {
            this.logger.debug(`❌ Similar - ${filePath}`)
          }
        }

        if (!removed) {
          // Find similar exif date
          const metadata = await this.getFileMetadata({
            filePath,
            includeExif: options.includeExif,
          })
          if (metadata.exifDate) {
            const similarExifDate =
              await this.databaseService.findFilesByExifDate(metadata.exifDate)
            if (similarExifDate.length > 0) {
              this.logger.info(`Files with similar exif date`)
              for (const file of similarExifDate) {
                this.logger.debug(`  ${file.path}`)
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
              this.logger.info(`Files with similar prefix`)
              for (const file of similarPrefix) {
                this.logger.debug(`  ${file.path}`)
              }
            }
          }
        }

        return {stop: false}
      },
    })
  }

  async crawl(path: string, options: CrawlingOptions): Promise<void> {
    path = expandPath(path)
    this.logger.debug(`Indexing ${path}`)

    await walkDirOrFile({
      path,
      options: {
        ignoreFileName: options.ignoreFileName ?? null,
      },
      callback: async (filePath) => {
        try {
          // Is it already indexed?
          const existingEntry = await this.databaseService.findFile(filePath)

          this.metrics.filesCrawled++

          if (existingEntry) {
            await this.hashFile({
              indexedFile: existingEntry,
              hashingAlgorithms: options.hashingAlgorithms,
            })
            if (
              options.includeExif &&
              isNullish(existingEntry.exifValidatedAt)
            ) {
              await this.databaseService.updateFileExifMetadata({
                indexedFileId: existingEntry.id,
                exifMetadata: await extractExif(existingEntry.path),
              })
              this.metrics.exifExtracted++
            }
          } else {
            this.logger.debug(`Indexing ${filePath}`)

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
        } catch (error) {
          this.logger.error(`Error processing ${filePath}`)
          this.logger.error(`${error}`)
          // Skip this file and continue
          return {stop: false}
        }
      },
    })

    this.logger.info(
      `${this.metrics.filesCrawled} files crawled. ${this.metrics.newFilesIndexed} newly indexed. ${this.metrics.filesHashed} files hashed. ${this.metrics.exifExtracted} exif extracted.`
    )
  }

  async verify(path: string, options: VerifyOptions): Promise<void> {
    path = expandPath(path)
    this.logger.debug(`Verifying ${path}`)

    const fileCount = await this.databaseService.countFilesInPath({path})
    this.logger.debug(`${fileCount} indexed files in ${path}`)

    const filesToProcess = options.limit
      ? Math.min(fileCount, options.limit)
      : fileCount

    while (this.metrics.filesCrawled < filesToProcess) {
      // Grab next batch of files
      const files = await this.databaseService.findByValidityInPath({
        path,
        count: Math.min(100, filesToProcess - this.metrics.filesCrawled),
      })

      this.logger.debug(`Verifying ${files.length} files`)

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
    this.logger.debug(`${this.metrics.filesCrawled} Verifying ${file.path}`)

    try {
      await access(file.path, constants.F_OK)
    } catch {
      this.logger.info(`File ${file.path} does not exist anymore`)

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
        metadata.mtime.getTime() === file.mtime.getTime()
      ) {
        await this.databaseService.updateFileValidity({
          indexedFileId: file.id,
        })
      } else {
        this.logger.info(
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
            this.logger.info(
              `Inconsistent hash ${hashingAlgorithm} for ${file.path}. ${hashResult?.hash} vs ${existingHash.value}`
            )
          }
        } else {
          this.logger.info(`Missing hash ${hashingAlgorithm} for ${file.path}`)
        }
      }
    } else {
      this.logger.info(
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

          // Hashing algorithm is not applicable to the file
          if (result === null) {
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

  private async lookupExistingEntries(path: string): Promise<{
    exactHashes: IndexedFile[]
    similarityHashes: IndexedFile[]
  }> {
    this.logger.debug(`Looking up for entries similar to ${path}`)
    const {size} = await this.getFileMetadata({
      filePath: path,
      includeExif: false,
    })

    const algorithmIsExact: Record<HashingAlgorithmType, boolean> = {
      [HashingAlgorithmType.XXHASH]: true,
      [HashingAlgorithmType.BLAKE3]: true,
      [HashingAlgorithmType.IDENTIFY]: false,
      [HashingAlgorithmType.FFMPG_SHA256]: false,
    }

    // Hashes of the file being looked up
    const hashes: Map<
      HashingAlgorithmType,
      {
        hash: string
        version: string
      }
    > = new Map()
    const getHash = async (algorithm: HashingAlgorithmType) => {
      if (!hashes.has(algorithm)) {
        const result = await this.hashingService.hash(path, algorithm)
        if (result !== null) {
          hashes.set(algorithm, result)
        }
      }
      return hashes.get(algorithm)
    }

    const exactMatches: IndexedFile[] = []
    const similarMatches: IndexedFile[] = []

    const filesWithSameSize = await this.databaseService.findFilesBySize(size)
    this.logger.debug(
      `Found ${filesWithSameSize.length} files with the same size`
    )

    for (const algorithm of Object.values(HashingAlgorithmType)) {
      const hashResult = await getHash(algorithm)
      if (hashResult) {
        const filesWithSameHash =
          await this.databaseService.findFilesByHashValue(
            algorithm,
            hashResult.hash
          )

        for (const file of filesWithSameHash) {
          const listToAdd = algorithmIsExact[algorithm]
            ? exactMatches
            : similarMatches

          if (!listToAdd.some((f) => f.path === file.path)) {
            listToAdd.push(file)
          }
        }
      }
    }

    return {exactHashes: exactMatches, similarityHashes: similarMatches}
  }

  private async getFileMetadata({
    filePath,
    includeExif,
  }: {
    filePath: string
    includeExif: boolean
  }) {
    const stats = await stat(filePath)

    let exifData
    if (includeExif) {
      exifData = await extractExif(filePath)
      this.metrics.exifExtracted++
    }

    // We remove the subsecond part of the time as we store them as integers
    stats.mtime.setMilliseconds(0)

    return {
      path: filePath,
      size: stats.size,
      mtime: stats.mtime,
      basename: nodePath.basename(filePath),
      extension: nodePath.extname(filePath),
      validatedAt: new Date(),
      ...exifData,
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
