import {FileEntity} from './entities/FileEntity'
import {ConnectionOptions} from 'typeorm'
import {HashEntity} from './entities/HashEntity'

export const getDatabaseConfig = (databasePath: string): ConnectionOptions => ({
  type: 'sqlite',
  database: databasePath,
  entities: [FileEntity, HashEntity],
  synchronize: true,
  logging: false,
})
