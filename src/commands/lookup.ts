import {Args, Command, Flags} from '@oclif/core'
import {IndexerService} from '../services/IndexerService.js'
import {humanReadableSeconds} from '../utils.js'
import {Logger} from '../services/LoggerService.js'

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

    const indexer = new IndexerService(flags.database)
    await indexer.lookup(args.path, {
      remove: flags.remove,
      includeExif: flags.exif,
    })
    console.log(
      `Operation performed in ${humanReadableSeconds(indexer.elapsedSeconds())}`
    )
  }
}
