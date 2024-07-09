import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'
import {relations, sql} from 'drizzle-orm'
import {createId} from '@paralleldrive/cuid2'
import {HashingAlgorithmType} from '../services/HashingService.js'

export const indexedFileTable = sqliteTable('file', {
  id: text('id', {
    length: 24,
  })
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  path: text('path').notNull(),
  size: integer('size').notNull(),
  mtime: integer('mtime', {mode: 'timestamp'}).notNull(),
  basename: text('basename').notNull(),
  extension: text('extension'),
  validatedAt: integer('validated_at', {mode: 'timestamp'}).notNull(),
  createdAt: integer('created_at', {mode: 'timestamp'})
    .default(sql`(datetime('now'))`)
    .notNull(),
  updatedAt: integer('updated_at', {mode: 'timestamp'})
    .default(sql`(datetime('now'))`)
    .notNull(),

  // Exif metadata
  make: text('make'),
  model: text('model'),
  width: integer('width'),
  height: integer('height'),
  exifDate: text('exif_date'),
  livePhotoSource: text('live_photo_source'),
  livePhotoTarget: text('live_photo_target'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  exifValidatedAt: integer('exif_validated_at', {mode: 'timestamp'}),
})

export const hashTable = sqliteTable(
  'hash',
  {
    fileId: text('file_id', {length: 24})
      .notNull()
      .references(() => indexedFileTable.id, {onDelete: 'cascade'}),
    algorithm: text('algorithm').$type<HashingAlgorithmType>().notNull(),
    version: text('version').notNull(),
    value: text('value').notNull(),
    validatedAt: integer('validated_at', {mode: 'timestamp'}).notNull(),
    createdAt: integer('created_at', {mode: 'timestamp'})
      .default(sql`(datetime('now'))`)
      .notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({
        columns: [table.algorithm, table.version, table.fileId],
        name: 'hash_algorithm_file_id_pk',
      }),
    }
  }
)

export const fileRelations = relations(indexedFileTable, ({many}) => ({
  hashes: many(hashTable),
}))

export const hashRelations = relations(hashTable, ({one}) => ({
  file: one(indexedFileTable, {
    fields: [hashTable.fileId],
    references: [indexedFileTable.id],
  }),
}))

export type IndexedFile = typeof indexedFileTable.$inferSelect
export type InsertIndexedFile = typeof indexedFileTable.$inferInsert

export type Hash = typeof hashTable.$inferSelect
export type InsertHash = typeof hashTable.$inferInsert

export type IndexedFileWithHashes = IndexedFile & {hashes: Hash[]}
