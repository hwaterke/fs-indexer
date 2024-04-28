import {Logger} from './LoggerService.js'
import {exec as callbackExec} from 'node:child_process'
import {promisify} from 'node:util'

const exec = promisify(callbackExec)

export enum HashingAlgorithm {
  BLAKE3 = 'BLAKE3',
  XXHASH = 'XXHASH',
}

export class HashingService {
  async hash(path: string, algorithm: HashingAlgorithm): Promise<string> {
    Logger.debug(`Computing hash ${algorithm} for ${path}`)

    switch (algorithm) {
      case HashingAlgorithm.BLAKE3: {
        return this.blake3(path)
      }
      case HashingAlgorithm.XXHASH: {
        return this.xxhash(path)
      }
    }
  }

  private async blake3(path: string): Promise<string> {
    const {stdout} = await exec(`b3sum --no-names "${path}"`)
    return stdout.trim()
  }

  private async xxhash(path: string): Promise<string> {
    const {stdout} = await exec(`xxh128sum "${path}"`)
    return stdout.split(/\s+/)[0].trim()
  }
}
