import {FileEntity} from '../database/entities/FileEntity'
import {LoggerService} from './LoggerService'
import {HashingAlgorithm} from './HashingService'

export class DuplicateFinderService {
  private logger = new LoggerService()

  /**
   * Finds duplicates in a group of files.
   * Returns a list of duplicate groups
   */
  getDuplicateGroups(files: FileEntity[]): FileEntity[][] {
    const sizeGroups = this.groupBySize(files).filter(
      (group) => group.length > 1
    )
    this.logger.debug(`${sizeGroups.length} groups of files with same size`)

    return sizeGroups
      .flatMap((group) => this.groupByHashes(group))
      .filter((group) => group.length > 1)
  }

  private groupBySize(files: FileEntity[]) {
    const bySize: Record<number, FileEntity[]> = {}
    for (const file of files) {
      if (!bySize[file.size]) {
        bySize[file.size] = []
      }
      bySize[file.size].push(file)
    }
    return Object.values(bySize)
  }

  private groupByHashes(files: FileEntity[]) {
    const hashGroups: FileEntity[][] = []
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

  private getHash(file: FileEntity, algorithm: HashingAlgorithm) {
    return file.hashes.find((hash) => hash.algorithm === algorithm)
  }

  debugGroup(files: FileEntity[]): void {
    console.table(files.map((f) => this.debug(f)))
  }

  debug(file: FileEntity) {
    return {
      path: file.path,
      size: file.size,
      ...file.hashes.reduce((acc, value) => {
        acc[value.algorithm] = value.value
        return acc
      }, {}),
    }
  }
}
