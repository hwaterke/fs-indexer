import 'reflect-metadata'
import {Command, flags} from '@oclif/command'
import {createConnection} from 'typeorm'
import {getDatabaseConfig} from '../database/config'
import {IndexerService} from '../services/IndexerService'
import {HashingAlgorithm} from '../services/HashingService'
import {getHashingAlgorithms, readableElapsedTime} from '../utils'

export default class Crawl extends Command {
  static description = 'index the folder provided'

  static flags = {
    help: flags.help({char: 'h'}),
    database: flags.string({
      char: 'd',
      description: 'database file',
      default: 'fs-index.db',
    }),
    hashingAlgorithms: flags.string({
      char: 'a',
      description: 'hashing algorithms to use',
      multiple: true,
      options: Object.values(HashingAlgorithm),
    }),
    limit: flags.integer({
      char: 'l',
      description: 'stop after indexing n files',
    }),
  }

  static args = [{name: 'path', required: true}]

  async run() {
    const {args, flags} = this.parse(Crawl)

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
