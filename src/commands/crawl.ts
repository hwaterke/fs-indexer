import 'reflect-metadata'
import {Args, Command, Flags} from '@oclif/core'
import {IndexerService} from '../services/IndexerService'
import {HashingAlgorithm} from '../services/HashingService'
import {getHashingAlgorithms, humanReadableSeconds} from '../utils'
import {Logger} from '../services/LoggerService'
import {getAppDatabaseSource} from '../database/AppDataSource'

export default class Crawl extends Command {
  static description = 'index the folder provided'

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
    exif: Flags.boolean({
      description: 'extract exif data',
      default: false,
    }),
    limit: Flags.integer({
      char: 'l',
      description: 'stop after indexing n files',
    }),
    minutes: Flags.integer({
      char: 'm',
      description: 'stop after n minutes',
    }),
    debug: Flags.boolean({
      description: 'enable debug logging',
    }),
  }

  static args = {
    path: Args.string({required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Crawl)

    if (flags.debug) {
      Logger.setLevel('debug')
    }

    const dataSource = getAppDatabaseSource(flags.database)
    await dataSource.initialize()
    try {
      const indexer = new IndexerService(dataSource)
      await indexer.crawl(args.path, {
        limit: flags.limit,
        minutes: flags.minutes,
        hashingAlgorithms: getHashingAlgorithms(flags.hashingAlgorithms),
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
