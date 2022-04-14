import 'reflect-metadata'
import {Command, Flags} from '@oclif/core'
import {createConnection} from 'typeorm'
import {getDatabaseConfig} from '../database/config'
import {IndexerService} from '../services/IndexerService'
import {HashingAlgorithm} from '../services/HashingService'
import {getHashingAlgorithms, readableElapsedTime} from '../utils'

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
    limit: Flags.integer({
      char: 'l',
      description: 'stop after indexing n files',
    }),
  }

  static args = [{name: 'path', required: true}]

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Crawl)

    const startTime = new Date()
    const connection = await createConnection(getDatabaseConfig(flags.database))
    try {
      const indexer = new IndexerService()
      await indexer.crawl(args.path, {
        limit: flags.limit,
        hashingAlgorithms: getHashingAlgorithms(flags.hashingAlgorithms),
      })
      console.log(`Operation performed in ${readableElapsedTime(startTime)}`)
    } finally {
      await connection.close()
    }
  }
}
