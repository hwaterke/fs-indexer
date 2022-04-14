import 'reflect-metadata'
import {Command, Flags} from '@oclif/core'
import {createConnection} from 'typeorm'
import {getDatabaseConfig} from '../database/config'
import {IndexerService} from '../services/IndexerService'
import {readableElapsedTime} from '../utils'
import {Logger} from '../services/LoggerService'

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
  }

  static args = [{name: 'path', required: true}]

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Lookup)

    if (flags.debug) {
      Logger.setLevel('debug')
    }

    const startTime = new Date()
    const connection = await createConnection(getDatabaseConfig(flags.database))
    try {
      const indexer = new IndexerService()
      await indexer.lookup(args.path)
      console.log(`Operation performed in ${readableElapsedTime(startTime)}`)
    } finally {
      await connection.close()
    }
  }
}
