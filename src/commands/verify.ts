import 'reflect-metadata'
import {Command, Flags} from '@oclif/core'
import {createConnection} from 'typeorm'
import {IndexerService} from '../services/IndexerService'
import {getDatabaseConfig} from '../database/config'
import {HashingAlgorithm} from '../services/HashingService'
import {getHashingAlgorithms, readableElapsedTime} from '../utils'
import {Logger} from '../services/LoggerService'

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
    purge: Flags.boolean({
      char: 'p',
      description: 'deletes files that do not exist anymore from the database',
      default: false,
    }),
    debug: Flags.boolean({
      description: 'enable debug logging',
    }),
  }

  static args = [{name: 'path', required: true}]

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Verify)

    if (flags.debug) {
      Logger.setLevel('debug')
    }

    const startTime = new Date()
    const connection = await createConnection(getDatabaseConfig(flags.database))
    try {
      const indexer = new IndexerService()
      await indexer.verify(args.path, {
        limit: flags.limit,
        purge: flags.purge,
        hashingAlgorithms: getHashingAlgorithms(flags.hashingAlgorithms),
      })
      console.log(`Operation performed in ${readableElapsedTime(startTime)}`)
    } finally {
      await connection.close()
    }
  }
}
