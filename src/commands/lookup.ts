import 'reflect-metadata'
import {Command, Flags} from '@oclif/core'
import {IndexerService} from '../services/IndexerService'
import {readableElapsedTime} from '../utils'
import {Logger} from '../services/LoggerService'
import {getAppDatabaseSource} from '../database/AppDataSource'

export default class Lookup extends Command {
  static description = 'searches for files within the database'

  static flags = {
    database: Flags.string({
      char: 'd',
      description: 'database file',
      default: 'fs-index.db',
    }),
    debug: Flags.boolean({
      description: 'enable debug logging',
    }),
    remove: Flags.boolean({
      description:
        'remove files if similar found in the index. Be careful with this flag. Only hashes are compared, not the file contents.',
      default: false,
    }),
  }

  static args = [{name: 'path', required: true}]

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Lookup)

    if (flags.debug) {
      Logger.setLevel('debug')
    }

    const startTime = new Date()
    const dataSource = getAppDatabaseSource(flags.database)
    await dataSource.initialize()
    try {
      const indexer = new IndexerService(dataSource)
      await indexer.lookup(args.path, {
        remove: flags.remove,
      })
      console.log(`Operation performed in ${readableElapsedTime(startTime)}`)
    } finally {
      await dataSource.destroy()
    }
  }
}
