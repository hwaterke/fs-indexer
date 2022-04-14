import {exec} from 'shelljs'
import {Logger} from './LoggerService'

export enum HashingAlgorithm {
  BLAKE3 = 'BLAKE3',
  XXHASH = 'XXHASH',
}

export class HashingService {
  hash(path: string, algorithm: HashingAlgorithm): string {
    Logger.debug(`Computing hash ${algorithm} for ${path}`)

    switch (algorithm) {
      case HashingAlgorithm.BLAKE3:
        return this.blake3(path)
      case HashingAlgorithm.XXHASH:
        return this.xxhash(path)
    }
  }

  private blake3(path: string): string {
    const result = exec(`b3sum --no-names "${path}"`, {silent: true})
    if (result.code !== 0) {
      throw new Error(`Error will computing BLAKE3 hash: ${result.stderr}`)
    }
    return result.stdout.trim()
  }

  private xxhash(path: string): string {
    const result = exec(`xxh128sum "${path}"`, {silent: true})
    if (result.code !== 0) {
      throw new Error(`Error will computing XXHASH hash: ${result.stderr}`)
    }
    return result.stdout.split(/\s+/)[0].trim()
  }
}
