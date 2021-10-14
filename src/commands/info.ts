import 'reflect-metadata'
import {Command, flags} from '@oclif/command'
import {createConnection} from 'typeorm'
import {IndexerService} from '../services/IndexerService'
import {getDatabaseConfig} from '../database/config'

export default class Info extends Command {
  static description = 'prints information about the database'

  static flags = {
    help: flags.help({char: 'h'}),
    database: flags.string({
      char: 'd',
      description: 'database file',
      default: 'fs-index.db',
    }),
  }

  async run() {
    const {flags} = this.parse(Info)

    const connection = await createConnection(getDatabaseConfig(flags.database))
    try {
      const indexer = new IndexerService()
      await indexer.info()
    } finally {
      await connection.close()
    }
  }
}
