import {FileEntity} from './entities/FileEntity'
import {DataSource} from 'typeorm'
import {HashEntity} from './entities/HashEntity'
import {InitialMigration1651605236637} from './migrations/1651605236637-InitialMigration'
import {ExifMigration1652798832847} from './migrations/1652798832847-ExifMigration'
import {ExifDateMigration1654705239151} from './migrations/1654705239151-ExifDateMigration'
import {LivePhotoMigration1691586419841} from './migrations/1691586419841-LivePhotoMigration'

let AppDataSource: DataSource | null = null

export const getAppDatabaseSource = (databasePath: string): DataSource => {
  if (AppDataSource === null) {
    AppDataSource = new DataSource({
      type: 'sqlite',
      database: databasePath,
      entities: [FileEntity, HashEntity],
      synchronize: false,
      logging: false,
      migrations: [
        InitialMigration1651605236637,
        ExifMigration1652798832847,
        ExifDateMigration1654705239151,
        LivePhotoMigration1691586419841,
      ],
      migrationsRun: true,
      subscribers: [],
    })
  }
  return AppDataSource
}
