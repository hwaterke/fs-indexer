import 'reflect-metadata'
import {Command, flags} from '@oclif/command'
import {createConnection} from 'typeorm'
import {IndexerService} from '../services/IndexerService'
import {getDatabaseConfig} from '../database/config'
import {HashingAlgorithm} from '../services/HashingService'
import {getHashingAlgorithms} from '../utils'

export default class Verify extends Command {
  static description =
    'verifies that the content of the database is in sync with the file system'

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
    purge: flags.boolean({
      char: 'p',
      description: 'deletes files that do not exist anymore from the database',
      default: false,
    }),
  }

  static args = [{name: 'path', required: true}]

  async run() {
    const {args, flags} = this.parse(Verify)

    const connection = await createConnection(getDatabaseConfig(flags.database))
    try {
      const indexer = new IndexerService()
      await indexer.verify(args.path, {
        purge: flags.purge,
        hashingAlgorithms: getHashingAlgorithms(flags.hashingAlgorithms),
      })
    } finally {
      await connection.close()
    }
  }
}
