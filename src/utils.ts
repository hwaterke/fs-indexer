import {opendir} from 'node:fs/promises'
import * as nodePath from 'node:path'
import {HashingAlgorithm} from './services/HashingService'
import {start} from 'repl'

type WalkCallback = (path: string) => Promise<{stop: boolean}>

export const walkDir = async (path: string, callback: WalkCallback) => {
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

export const readableElapsedTime = (startTime: Date) => {
  const now = new Date()
  const seconds = Math.ceil((now.getTime() - startTime.getTime()) / 1000)

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
