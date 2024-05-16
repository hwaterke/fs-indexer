import {Logger} from './LoggerService.js'
import {exec as callbackExec} from 'node:child_process'
import {extname} from 'node:path'
import {promisify} from 'node:util'

const exec = promisify(callbackExec)

const UNKNOW_VERSION = 'unknown'

export enum HashingAlgorithmType {
  BLAKE3 = 'BLAKE3',
  FFMPG_SHA256 = 'FFMPG_SHA256',
  IDENTIFY = 'IDENTIFY',
  XXHASH = 'XXHASH',
}

abstract class HashingAlgorithm {
  abstract readonly type: HashingAlgorithmType
  abstract readonly supportedFileTypes: string[] | null
  private version: string | null = null

  abstract hash(path: string): Promise<string>

  isFileSupported(path: string): boolean {
    if (this.supportedFileTypes === null) {
      return true
    }

    const extension = extname(path).toLowerCase()
    return this.supportedFileTypes.includes(extension)
  }

  abstract getToolVersion(): Promise<string>

  async getVersion(): Promise<string> {
    if (this.version === null) {
      this.version = await this.getToolVersion()
    }
    return this.version
  }
}

class Blake3 extends HashingAlgorithm {
  readonly type = HashingAlgorithmType.BLAKE3
  readonly supportedFileTypes = null

  async hash(path: string): Promise<string> {
    const {stdout} = await exec(`b3sum --no-names "${path}"`)
    return stdout.trim()
  }

  async getToolVersion(): Promise<string> {
    const {stdout} = await exec(`b3sum --version`)
    const version = stdout.match(/\d+\.\d+\.\d+/)
    return version ? version[0] : UNKNOW_VERSION
  }
}

class Xxhash extends HashingAlgorithm {
  readonly type = HashingAlgorithmType.XXHASH
  readonly supportedFileTypes = null

  async hash(path: string): Promise<string> {
    const {stdout} = await exec(`xxh128sum "${path}"`)
    return stdout.split(/\s+/)[0].trim()
  }

  async getToolVersion(): Promise<string> {
    const {stderr} = await exec(`xxh128sum --version`)
    const version = stderr.match(/\d+\.\d+\.\d+/)
    return version ? version[0] : UNKNOW_VERSION
  }
}

class Identify extends HashingAlgorithm {
  readonly type = HashingAlgorithmType.IDENTIFY
  readonly supportedFileTypes = [
    '.bmp',
    '.dng',
    '.gif',
    '.heic',
    '.ico',
    '.jfif',
    '.jpeg',
    '.jpg',
    '.nef',
    '.png',
    '.svg',
    '.tiff',
    '.webp',
  ]

  async hash(path: string): Promise<string> {
    const {stdout} = await exec(`identify -format '%#' "${path}"`)
    return stdout.trim()
  }

  async getToolVersion(): Promise<string> {
    const {stdout} = await exec(`identify -version`)
    const version = stdout.match(/\d+\.\d+\.\d+(-\d+)?/)
    return version ? version[0] : UNKNOW_VERSION
  }
}

class FfmpegSha256 extends HashingAlgorithm {
  readonly type = HashingAlgorithmType.FFMPG_SHA256
  readonly supportedFileTypes = ['.mov', '.mp4', '.avi', '.mkv']

  async hash(path: string): Promise<string> {
    const {stdout} = await exec(
      `ffmpeg -i "${path}" -map 0 -c copy -f hash -hash sha256 -`
    )
    return stdout.trim()
  }

  async getToolVersion(): Promise<string> {
    const {stdout} = await exec(`ffmpeg -version`)
    const version = stdout.match(/\d+\.\d+(\.\d+)?/)
    return version ? version[0] : UNKNOW_VERSION
  }
}

export class HashingService {
  private readonly algorithms: Record<HashingAlgorithmType, HashingAlgorithm> =
    {
      [HashingAlgorithmType.BLAKE3]: new Blake3(),
      [HashingAlgorithmType.XXHASH]: new Xxhash(),
      [HashingAlgorithmType.IDENTIFY]: new Identify(),
      [HashingAlgorithmType.FFMPG_SHA256]: new FfmpegSha256(),
    }

  async hash(
    path: string,
    algorithm: HashingAlgorithmType
  ): Promise<{
    hash: string
    version: string
  } | null> {
    Logger.debug(`Computing hash ${algorithm} for ${path}`)

    const hashingAlgorithm = this.algorithms[algorithm]

    if (!hashingAlgorithm.isFileSupported(path)) {
      Logger.debug(`File type not supported for ${algorithm}`)
      return null
    }

    const hash = await hashingAlgorithm.hash(path)
    const version = await hashingAlgorithm.getVersion()

    return {hash, version}
  }
}
