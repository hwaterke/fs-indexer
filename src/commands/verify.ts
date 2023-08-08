import 'reflect-metadata'
import {Args, Command, Flags} from '@oclif/core'
import {IndexerService} from '../services/IndexerService'
import {HashingAlgorithm} from '../services/HashingService'
import {getHashingAlgorithms, humanReadableSeconds} from '../utils'
import {Logger} from '../services/LoggerService'
import {getAppDatabaseSource} from '../database/AppDataSource'

export default class Verify extends Command {
  static description =
    'verifies that the content of the database is in sync with the file system'

  static flags = {
    database: Flags.string({
      char: 'd',
      description: 'database file',
      default: 'fs-index.db',
    }),
    hashingAlgorithms: Flags.string({
      char: 'a',
      description: 'hashing algorithms to use',
      multiple: true,
      options: Object.values(HashingAlgorithm),
    }),
    limit: Flags.integer({
      char: 'l',
      description: 'stop after indexing n files',
    }),
    minutes: Flags.integer({
      char: 'm',
      description: 'stop after n minutes',
    }),
    purge: Flags.boolean({
      char: 'p',
      description: 'deletes files that do not exist anymore from the database',
      default: false,
    }),
    debug: Flags.boolean({
      description: 'enable debug logging',
    }),
  }

  static args = {
    path: Args.string({required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Verify)

    if (flags.debug) {
      Logger.setLevel('debug')
    }

    const dataSource = getAppDatabaseSource(flags.database)
    await dataSource.initialize()
    try {
      const indexer = new IndexerService(dataSource)
      await indexer.verify(args.path, {
        limit: flags.limit,
        minutes: flags.minutes,
        purge: flags.purge,
        hashingAlgorithms: getHashingAlgorithms(flags.hashingAlgorithms),
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
