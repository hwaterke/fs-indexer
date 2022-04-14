import {getRepository} from 'typeorm'
import {FileEntity} from '../database/entities/FileEntity'
import {walkDirOrFile} from '../utils'
import {access, stat, writeFile} from 'node:fs/promises'
import {constants} from 'node:fs'
import {LoggerService} from './LoggerService'
import {DatabaseService} from './DatabaseService'
import * as nodePath from 'node:path'
import {HashingAlgorithm, HashingService} from './HashingService'
import {HashEntity} from '../database/entities/HashEntity'
import {DuplicateFinderService} from './DuplicateFinderService'

type CrawlingOptions = {
  limit?: number
  hashingAlgorithms: HashingAlgorithm[]
}

type VerifyOptions = {
  limit?: number
  hashingAlgorithms: HashingAlgorithm[]
  purge: boolean
}

type InfoOptions = {
  duplicates: boolean
}

export class IndexerService {
  private logger = new LoggerService()
  private databaseService = new DatabaseService()
  private hashingService = new HashingService()
  private duplicateFinder = new DuplicateFinderService()

  private metrics = {
    filesCrawled: 0,
    newFilesIndexed: 0,
    filesHashed: 0,
    hashesComputed: 0,
  }

  async info(options: InfoOptions): Promise<void> {
    const fileCount = await this.databaseService.countFiles()
    this.logger.info(`${fileCount} files indexed`)
    const hashCount = await this.databaseService.countHashes()
    this.logger.info(`${hashCount} hashes`)

    for await (const algorithm of Object.values(HashingAlgorithm)) {
      const algoHashCount = await this.databaseService.countHashes(algorithm)
      this.logger.info(
        `${algoHashCount} hashes (${algorithm}) - ${Math.round(
          (100 * algoHashCount) / fileCount
        )}%`
      )
    }

    if (options.duplicates) {
      const candidates = await this.databaseService.duplicates()
      this.logger.debug(`${candidates.length} duplicate candidates`)

      const duplicates = this.duplicateFinder.getDuplicateGroups(candidates)

      // Write duplicates to file
      const data = JSON.stringify(
        duplicates.map((group) => group.map((f) => f.path))
      )
      await writeFile('./duplicates.json', data, 'utf8')

      duplicates.map((group) => this.duplicateFinder.debugGroup(group))
    }
  }

  async lookup(path: string): Promise<void> {
    this.logger.debug(`Lookup ${path}`)

    await walkDirOrFile(path, async (filePath) => {
      const similarFiles = await this.lookupExistingEntries(filePath)
      if (similarFiles.length > 0) {
        if (similarFiles.length === 1 && similarFiles[0].path === filePath) {
          this.logger.info(`🆗 ${filePath}`)
        } else {
          this.logger.info(`✅ ${filePath}`)
        }

        for (const file of similarFiles) {
          this.logger.debug(`  ${file.path}`)
        }
      } else {
        this.logger.info(`❌ ${filePath}`)
      }

      return {stop: false}
    })
  }

  async crawl(path: string, options: CrawlingOptions): Promise<void> {
    this.logger.debug(`Indexing ${path}`)

    await walkDirOrFile(path, async (filePath) => {
      // Is it already indexed?
      const existingEntry = await this.databaseService.findFile(filePath)

      this.metrics.filesCrawled++

      if (existingEntry) {
        await this.hashFile(filePath, options.hashingAlgorithms, existingEntry)
      } else {
        this.logger.debug(`Indexing ${filePath}`)

        const metadata = await this.getFileMetadata(filePath)

        const repo = getRepository(FileEntity)
        const fileEntity = await repo.save(metadata)

        this.metrics.newFilesIndexed++

        await this.hashFile(filePath, options.hashingAlgorithms, fileEntity)
      }

      return {
        stop: !!(
          options.limit &&
          Math.max(this.metrics.newFilesIndexed, this.metrics.filesHashed) >=
            options.limit
        ),
      }
    })

    this.logger.info(
      `${this.metrics.filesCrawled} files crawled. ${this.metrics.newFilesIndexed} newly indexed. ${this.metrics.filesHashed} files hashed.`
    )
  }

  async verify(path: string, options: VerifyOptions): Promise<void> {
    this.logger.debug(`Verifying ${path}`)
    const repo = getRepository(FileEntity)

    const files = await this.databaseService.findAll()

    for (const file of files) {
      if (options.limit && this.metrics.filesCrawled > options.limit) {
        break
      }
      if (!file.path.startsWith(path)) {
        continue
      }

      this.metrics.filesCrawled++

      try {
        await access(file.path, constants.F_OK)
      } catch {
        this.logger.info(`File ${file.path} does not exist anymore`)

        if (options.purge) {
          await repo.remove(file)
        }
        continue
      }

      // File still exists, validate the stats
      const metadata = await this.getFileMetadata(file.path)

      if (metadata.size === file.size) {
        if (
          metadata.path === file.path &&
          metadata.basename === file.basename &&
          metadata.extension === file.extension &&
          metadata.mtime === file.mtime &&
          metadata.ctime === file.ctime
        ) {
          await getRepository(FileEntity).update(file.uuid, {
            validatedAt: new Date(),
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
            const hash = this.hashingService.hash(file.path, hashingAlgorithm)
            if (hash === existingHash.value) {
              await getRepository(HashEntity).update(
                {
                  file: {uuid: file.uuid},
                  algorithm: existingHash.algorithm,
                },
                {
                  validatedAt: new Date(),
                }
              )
            } else {
              this.logger.info(
                `Inconsistent hash ${hashingAlgorithm} for ${file.path}. ${hash} vs ${existingHash.value}`
              )
            }
          } else {
            this.logger.info(`Missing hash ${hashingAlgorithm} for ${file}`)
          }
        }
      } else {
        this.logger.info(
          `${file.path} has a different size. ${metadata.size} vs ${file.size}`
        )
      }
    }
  }

  private async hashFile(
    path: string,
    hashingAlgorithms: HashingAlgorithm[],
    fileEntity: FileEntity | undefined
  ): Promise<void> {
    let hashesComputed = false

    if (hashingAlgorithms.length > 0) {
      const hr = getRepository(HashEntity)

      for await (const hashingAlgorithm of hashingAlgorithms) {
        if (
          !fileEntity?.hashes ||
          !fileEntity.hashes.some((he) => he.algorithm === hashingAlgorithm)
        ) {
          const hash = this.hashingService.hash(path, hashingAlgorithm)
          this.metrics.hashesComputed++
          hashesComputed = true

          await hr.save({
            file: fileEntity,
            algorithm: hashingAlgorithm,
            value: hash,
            validatedAt: new Date(),
          })
        }
      }
    }

    if (hashesComputed) {
      this.metrics.filesHashed++
    }
  }

  private async lookupExistingEntries(path: string): Promise<FileEntity[]> {
    const {size} = await this.getFileMetadata(path)

    const existingEntries: FileEntity[] = []

    const filesWithSameSize = await this.databaseService.findFilesBySize(size)
    this.logger.debug(
      `Found ${filesWithSameSize.length} files with the same size`
    )

    for (const file of filesWithSameSize) {
      if (
        file.hashes.length > 0 &&
        file.hashes.every((hashEntity) => {
          const hash = this.hashingService.hash(path, hashEntity.algorithm)

          this.logger.debug(
            `Comparing ${hash} with ${hashEntity.value} for ${hashEntity.algorithm}`
          )

          return hash === hashEntity.value
        })
      ) {
        existingEntries.push(file)
      }
    }

    return existingEntries
  }

  private async getFileMetadata(filePath: string) {
    const stats = await stat(filePath)

    return {
      path: filePath,
      size: stats.size,
      ctime: Math.floor(stats.ctimeMs),
      mtime: Math.floor(stats.mtimeMs),
      basename: nodePath.basename(filePath),
      extension: nodePath.extname(filePath),
      validatedAt: new Date(),
    }
  }
}
