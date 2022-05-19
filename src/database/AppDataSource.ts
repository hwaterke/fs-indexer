import {FileEntity} from './entities/FileEntity'
import {DataSource} from 'typeorm'
import {HashEntity} from './entities/HashEntity'
import {InitialMigration1651605236637} from './migrations/1651605236637-InitialMigration'
import {ExifMigration1652798832847} from './migrations/1652798832847-ExifMigration'

let AppDataSource: DataSource | null = null

export const getAppDatabaseSource = (databasePath: string): DataSource => {
  if (AppDataSource === null) {
    AppDataSource = new DataSource({
      type: 'sqlite',
      database: databasePath,
      entities: [FileEntity, HashEntity],
      synchronize: false,
      logging: false,
      migrations: [InitialMigration1651605236637, ExifMigration1652798832847],
      migrationsRun: true,
      subscribers: [],
    })
  }
  return AppDataSource
}
