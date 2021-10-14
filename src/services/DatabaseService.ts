import {LoggerService} from './LoggerService'
import {getRepository} from 'typeorm'
import {FileEntity} from '../database/entities/FileEntity'

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
}
