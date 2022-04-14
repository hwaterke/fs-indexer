import 'reflect-metadata'
import {Command, Flags} from '@oclif/core'
import {createConnection} from 'typeorm'
import {IndexerService} from '../services/IndexerService'
import {getDatabaseConfig} from '../database/config'
import {readableElapsedTime} from '../utils'

export default class Info extends Command {
  static description = 'prints information about the database'

  static flags = {
    database: Flags.string({
      char: 'd',
      description: 'database file',
      default: 'fs-index.db',
    }),
    duplicates: Flags.boolean({default: false}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Info)

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
