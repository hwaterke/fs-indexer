import {Command, Flags} from '@oclif/core'
import {IndexerService} from '../services/IndexerService.js'
import {humanReadableSeconds} from '../utils.js'
import {Logger} from '../services/LoggerService.js'

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

    const indexer = new IndexerService(flags.database)
    await indexer.info({duplicates: flags.duplicates})
    console.log(
      `Operation performed in ${humanReadableSeconds(indexer.elapsedSeconds())}`
    )
  }
}
