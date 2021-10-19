import {LoggerService} from './LoggerService'
import {getRepository} from 'typeorm'
import {FileEntity} from '../database/entities/FileEntity'
import {HashEntity} from '../database/entities/HashEntity'
import {HashingAlgorithm} from './HashingService'

export class DatabaseService {
  private logger = new LoggerService()

  async findFile(path: string) {
    const repository = getRepository(FileEntity)

    return await repository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.hashes', 'hash')
      .where('file.path = :path', {path})
      .getOne()
  }

  async findAll() {
    const repository = getRepository(FileEntity)

    return await repository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.hashes', 'hash')
      .getMany()
  }

  async countFiles() {
    const repository = getRepository(FileEntity)
    return await repository.count()
  }

  async countHashes(algorithm?: HashingAlgorithm) {
    const repository = getRepository(HashEntity)
    return await repository.count({algorithm})
  }

  async duplicates() {
    // Duplicates have their size and all their hashes in common
    const repository = getRepository(HashEntity)
    return await repository.createQueryBuilder('hash').getMany()
  }
}
