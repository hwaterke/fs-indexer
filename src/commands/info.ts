import 'reflect-metadata'
import {Command, Flags} from '@oclif/core'
import {IndexerService} from '../services/IndexerService'
import {humanReadableSeconds} from '../utils'
import {Logger} from '../services/LoggerService'
import {getAppDatabaseSource} from '../database/AppDataSource'

export default class Info extends Command {
  static description = 'prints information about the database'

  static flags = {
    database: Flags.string({
      char: 'd',
      description: 'database file',
      default: 'fs-index.db',
    }),
    duplicates: Flags.boolean({default: false}),
    debug: Flags.boolean({
      description: 'enable debug logging',
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Info)

    if (flags.debug) {
      Logger.setLevel('debug')
    }

    const dataSource = getAppDatabaseSource(flags.database)
    await dataSource.initialize()
    try {
      const indexer = new IndexerService(dataSource)
      await indexer.info({duplicates: flags.duplicates})
      console.log(
        `Operation performed in ${humanReadableSeconds(
          indexer.elapsedSeconds()
        )}`
      )
    } finally {
      await dataSource.destroy()
    }
  }
}
