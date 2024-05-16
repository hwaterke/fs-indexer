import {HashingAlgorithmType} from './HashingService.js'
import {ExifMetadata} from '../utils.js'
import {BetterSQLite3Database} from 'drizzle-orm/better-sqlite3/driver'
import * as schema from '../drizzle/schema.js'
import {
  IndexedFile,
  IndexedFileWithHashes,
  InsertIndexedFile,
  hashTable,
  indexedFileTable,
} from '../drizzle/schema.js'
import Database from 'better-sqlite3'
import {drizzle} from 'drizzle-orm/better-sqlite3'
import {migrate} from 'drizzle-orm/better-sqlite3/migrator'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {and, asc, count, eq, gt, like, sum} from 'drizzle-orm'

export class DatabaseService {
  private readonly db: BetterSQLite3Database<typeof schema>

  constructor(databasePath: string, logQueries = false) {
    const sqlite = new Database(databasePath)
    this.db = drizzle(sqlite, {schema, logger: logQueries})

    migrate(this.db, {
      migrationsFolder: resolve(
        dirname(fileURLToPath(import.meta.url)),
        '../drizzle/migrations'
      ),
    })
  }

  async createFile(file: InsertIndexedFile) {
    return this.db.insert(indexedFileTable).values(file).returning({
      id: indexedFileTable.id,
      path: indexedFileTable.path,
    })
  }

  async updateFileExifMetadata({
    indexedFileId,
    exifMetadata,
  }: {
    indexedFileId: string
    exifMetadata: ExifMetadata
  }): Promise<void> {
    await this.db
      .update(indexedFileTable)
      .set({
        ...exifMetadata,
        updatedAt: new Date(),
      })
      .where(eq(indexedFileTable.id, indexedFileId))
  }

  async deleteFile({indexedFileId}: {indexedFileId: string}): Promise<void> {
    await this.db
      .delete(indexedFileTable)
      .where(eq(indexedFileTable.id, indexedFileId))
  }

  async updateFileValidity({
    indexedFileId,
  }: {
    indexedFileId: string
  }): Promise<void> {
    await this.db
      .update(indexedFileTable)
      .set({validatedAt: new Date(), updatedAt: new Date()})
      .where(eq(indexedFileTable.id, indexedFileId))
  }

  async createHash({
    indexedFileId,
    algorithm,
    version,
    hash,
  }: {
    indexedFileId: string
    algorithm: HashingAlgorithmType
    version: string
    hash: string
  }): Promise<void> {
    await this.db.insert(schema.hashTable).values({
      fileId: indexedFileId,
      algorithm,
      version,
      value: hash,
      validatedAt: new Date(),
    })
  }

  async updateHashValidity(
    fileUuid: string,
    algorithm: HashingAlgorithmType
  ): Promise<void> {
    await this.db
      .update(schema.hashTable)
      .set({validatedAt: new Date()})
      .where(
        and(
          eq(schema.hashTable.fileId, fileUuid),
          eq(schema.hashTable.algorithm, algorithm)
        )
      )
  }

  async findFile(path: string) {
    const result = await this.db.query.indexedFileTable.findFirst({
      where: eq(indexedFileTable.path, path),
      with: {
        hashes: true,
      },
    })
    return result ?? null
  }

  async findFilesBySize(size: number) {
    return this.db.query.indexedFileTable.findMany({
      where: eq(indexedFileTable.size, size),
      with: {
        hashes: true,
      },
    })
  }

  async findFilesByExifDate(exifDate: string): Promise<IndexedFile[]> {
    return this.db.query.indexedFileTable.findMany({
      where: eq(indexedFileTable.exifDate, exifDate),
    })
  }

  async findFilesByPrefix(prefix: string): Promise<IndexedFile[]> {
    return this.db.query.indexedFileTable.findMany({
      where: like(indexedFileTable.basename, `${prefix}%`),
    })
  }

  async findByValidityInPath({
    count,
    path,
  }: {
    count: number
    path: string
  }): Promise<IndexedFileWithHashes[]> {
    return this.db.query.indexedFileTable.findMany({
      where: like(indexedFileTable.path, `${path}%`),
      limit: count,
      orderBy: asc(indexedFileTable.validatedAt),
      with: {
        hashes: true,
      },
    })
  }

  async totalSize(): Promise<number> {
    const results = await this.db
      .select({totalSize: sum(indexedFileTable.size).mapWith(Number)})
      .from(indexedFileTable)

    if (results.length === 0) {
      return 0
    }
    return results[0].totalSize
  }

  async countFiles(): Promise<number> {
    const results = await this.db
      .select({count: count(indexedFileTable.id)})
      .from(indexedFileTable)

    if (results.length === 0) {
      return 0
    }
    return results[0].count
  }

  async countFilesInPath({path}: {path: string}): Promise<number> {
    const results = await this.db
      .select({count: count(indexedFileTable.id)})
      .from(indexedFileTable)
      .where(like(indexedFileTable.path, `${path}%`))

    if (results.length === 0) {
      return 0
    }
    return results[0].count
  }

  async countHashes(algorithm?: HashingAlgorithmType): Promise<number> {
    const results = await this.db
      .select({count: count()})
      .from(schema.hashTable)
      .where(algorithm ? eq(schema.hashTable.algorithm, algorithm) : undefined)

    if (results.length === 0) {
      return 0
    }
    return results[0].count
  }

  async duplicates() {
    const duplicateHashQuery = this.db
      .select({
        algorithm: hashTable.algorithm,
        value: hashTable.value,
        count: count().mapWith(Number).as('hash_count'),
      })
      .from(schema.hashTable)
      .groupBy(hashTable.algorithm, hashTable.value)
      .having(({count}) => gt(count, 1))
      .as('duplicateHashQuery')

    const result = await this.db
      .select({
        id: indexedFileTable.id,
        path: indexedFileTable.path,
        size: indexedFileTable.size,
        value: hashTable.value,
        algorithm: hashTable.algorithm,
      })
      .from(indexedFileTable)
      .innerJoin(hashTable, eq(indexedFileTable.id, hashTable.fileId))
      .innerJoin(
        duplicateHashQuery,
        and(
          eq(hashTable.algorithm, duplicateHashQuery.algorithm),
          eq(hashTable.value, duplicateHashQuery.value)
        )
      )

    return result
  }
}
