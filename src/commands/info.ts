import 'reflect-metadata'
import {Command, flags} from '@oclif/command'
import {createConnection} from 'typeorm'
import {IndexerService} from '../services/IndexerService'
import {getDatabaseConfig} from '../database/config'
import {readableElapsedTime} from '../utils'

export default class Info extends Command {
  static description = 'prints information about the database'

  static flags = {
    help: flags.help({char: 'h'}),
    database: flags.string({
      char: 'd',
      description: 'database file',
      default: 'fs-index.db',
    }),
    duplicates: flags.boolean({default: false}),
  }

  async run() {
    const {flags} = this.parse(Info)

    const startTime = new Date()
    const connection = await createConnection(getDatabaseConfig(flags.database))
    try {
      const indexer = new IndexerService()
      await indexer.info({duplicates: flags.duplicates})
      console.log(`Operation performed in ${readableElapsedTime(startTime)}`)
    } finally {
      await connection.close()
    }
  }
}
