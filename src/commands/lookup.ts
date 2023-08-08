import 'reflect-metadata'
import {Args, Command, Flags} from '@oclif/core'
import {IndexerService} from '../services/IndexerService'
import {humanReadableSeconds} from '../utils'
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
        'remove files if similar found in the index. Be careful with this flag. Only hashes are compared, not the files content.',
      default: false,
    }),
    exif: Flags.boolean({
      description: 'look for files with similar exif date',
      default: false,
    }),
  }

  static args = {
    path: Args.string({required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Lookup)

    if (flags.debug) {
      Logger.setLevel('debug')
    }

    const dataSource = getAppDatabaseSource(flags.database)
    await dataSource.initialize()
    try {
      const indexer = new IndexerService(dataSource)
      await indexer.lookup(args.path, {
        remove: flags.remove,
        includeExif: flags.exif,
      })
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
