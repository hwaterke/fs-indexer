import {opendir, stat} from 'node:fs/promises'
import * as nodePath from 'node:path'
import {homedir} from 'node:os'
import {HashingAlgorithm} from './services/HashingService'

type WalkCallback = (path: string) => Promise<{stop: boolean}>

export const walkDirOrFile = async (
  path: string,
  callback: WalkCallback
): Promise<void> => {
  const stats = await stat(path)
  await (stats.isDirectory() ? walkDir(path, callback) : callback(path))
}

export const walkDir = async (
  path: string,
  callback: WalkCallback
): Promise<void> => {
  let shouldStop = false

  const recursiveWalk = async (directoryPath: string) => {
    const dir = await opendir(directoryPath)
    for await (const dirent of dir) {
      const filepath = nodePath.join(directoryPath, dirent.name)

      if (shouldStop) {
        return
      }

      if (dirent.isDirectory() && !dirent.isSymbolicLink()) {
        await recursiveWalk(filepath)
      } else if (dirent.isFile()) {
        shouldStop = (await callback(filepath)).stop
      }
    }
  }

  await recursiveWalk(path)
}

export const uniq = <T>(array: T[]): T[] => {
  return [...new Set(array)]
}

export const getHashingAlgorithms = (
  input: string[] | undefined
): HashingAlgorithm[] => {
  const result = uniq(input || [])
  return result as HashingAlgorithm[]
}

export const humanReadableSeconds = (seconds: number): string => {
  if (seconds > 3600) {
    const hours = Math.floor(seconds / 3600)
    const secondsLeft = seconds % 3600
    return `${hours} hours ${Math.floor(secondsLeft / 60)} minutes ${
      secondsLeft % 60
    } seconds`
  }

  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds`
  }

  return `${seconds} seconds`
}

export const expandPath = (path: string): string => {
  if (path.startsWith('~/') || path === '~') {
    path = path.replace('~', homedir())
  }

  return nodePath.resolve(path)
}
