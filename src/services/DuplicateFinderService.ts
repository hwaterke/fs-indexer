import {HashingAlgorithm} from './HashingService.js'
import {Logger} from './LoggerService.js'
import {IndexedFileWithHashes} from '../drizzle/schema.js'

export class DuplicateFinderService {
  /**
   * Finds duplicates in a group of files.
   * Returns a list of duplicate groups
   */
  getDuplicateGroups<
    T extends {
      path: string
      size: number
      hashes: {algorithm: HashingAlgorithm; value: string}[]
    },
  >(files: T[]): T[][] {
    const sizeGroups = this.groupBySize(files).filter(
      (group) => group.length > 1
    )
    Logger.debug(`${sizeGroups.length} groups of files with same size`)

    const unsorted = sizeGroups
      .flatMap((group) => this.groupByHashes(group))
      .filter((group) => group.length > 1)

    // Sort by group length
    const sorted = unsorted.sort((a, b) => b.length - a.length)

    // Sort by path
    const sortedByPath = sorted.map((group) =>
      group.sort((a, b) => a.path.localeCompare(b.path))
    )

    return sortedByPath
  }

  private groupBySize<T extends {size: number}>(files: T[]): T[][] {
    const bySize: Record<number, T[]> = {}
    for (const file of files) {
      if (!bySize[file.size]) {
        bySize[file.size] = []
      }
      bySize[file.size].push(file)
    }
    return Object.values(bySize)
  }

  private groupByHashes<
    T extends {
      hashes: {algorithm: HashingAlgorithm; value: string}[]
    },
  >(files: T[]) {
    const hashGroups: T[][] = []
    for (const file of files) {
      let added = false
      // Try to place it in a group with similar hashes
      for (const hashGroup of hashGroups) {
        const head = hashGroup[0]
        if (
          Object.values(HashingAlgorithm).every(
            (algo) =>
              this.getHash(file, algo)?.value ===
              this.getHash(head, algo)?.value
          )
        ) {
          hashGroup.push(file)
          added = true
          break
        }
      }

      // If none found add it to hiw own group
      if (!added) {
        hashGroups.push([file])
      }
    }
    return hashGroups
  }

  private getHash(
    file: {
      hashes: {algorithm: HashingAlgorithm; value: string}[]
    },
    algorithm: HashingAlgorithm
  ) {
    return file.hashes.find((hash) => hash.algorithm === algorithm)
  }

  debugGroup(files: IndexedFileWithHashes[]): void {
    console.table(files.map((f) => this.debug(f)))
  }

  debug(file: IndexedFileWithHashes): Record<string, string | number> {
    return {
      path: file.path,
      size: file.size,
      ...Object.fromEntries(
        file.hashes.map((hash) => [hash.algorithm, hash.value])
      ),
    }
  }
}
