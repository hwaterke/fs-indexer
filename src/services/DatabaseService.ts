import {LoggerService} from './LoggerService'
import {getRepository} from 'typeorm'
import {FileEntity} from '../database/entities/FileEntity'
import {HashEntity} from '../database/entities/HashEntity'
import {HashingAlgorithm} from './HashingService'

export class DatabaseService {
  private logger = new LoggerService()

  async findFile(path: string): Promise<FileEntity | undefined> {
    const repository = getRepository(FileEntity)

    return await repository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.hashes', 'hash')
      .where('file.path = :path', {path})
      .getOne()
  }

  async findFilesBySize(size: number): Promise<FileEntity[]> {
    const repository = getRepository(FileEntity)

    return await repository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.hashes', 'hash')
      .where('file.size = :size', {size})
      .getMany()
  }

  async findAll(): Promise<FileEntity[]> {
    const repository = getRepository(FileEntity)

    return await repository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.hashes', 'hash')
      .getMany()
  }

  async countFiles(): Promise<number> {
    const repository = getRepository(FileEntity)
    return await repository.count()
  }

  async countHashes(algorithm?: HashingAlgorithm): Promise<number> {
    const repository = getRepository(HashEntity)
    return await repository.count({algorithm})
  }

  async duplicates(): Promise<FileEntity[]> {
    const repository = getRepository(FileEntity)

    const files = await repository
      .createQueryBuilder('file')
      .innerJoinAndSelect('file.hashes', 'hash')
      .innerJoin(
        (qb) =>
          qb
            .select('hd.algorithm', 'd_algo')
            .addSelect('hd.value', 'd_value')
            .addSelect('COUNT(*)')
            .from(HashEntity, 'hd')
            .groupBy('hd.algorithm')
            .addGroupBy('hd.value')
            .having('COUNT(*) > 1'),
        'dup',
        'hash.value = dup.d_value AND hash.algorithm = dup.d_algo'
      )
      .getMany()

    return files
  }
}
