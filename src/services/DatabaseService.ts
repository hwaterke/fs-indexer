import {DataSource, Like} from 'typeorm'
import {FileEntity} from '../database/entities/FileEntity'
import {HashEntity} from '../database/entities/HashEntity'
import {HashingAlgorithm} from './HashingService'
import {ExifMetadata} from '../utils'

export class DatabaseService {
  constructor(private datasource: DataSource) {}

  async createFile(
    file: Omit<FileEntity, 'uuid' | 'hashes' | 'createdAt' | 'updatedAt'>
  ): Promise<FileEntity> {
    const repository = this.datasource.getRepository(FileEntity)
    return repository.save(file)
  }

  async updateFileExifMetadata({
    fileUuid,
    exifMetadata,
  }: {
    fileUuid: string
    exifMetadata: ExifMetadata
  }): Promise<void> {
    const repository = this.datasource.getRepository(FileEntity)
    await repository.update(fileUuid, exifMetadata)
  }

  async deleteFile(file: FileEntity): Promise<void> {
    const repository = this.datasource.getRepository(FileEntity)
    await repository.remove(file)
  }

  async updateFileValidity(fileUuid: string): Promise<void> {
    const repository = this.datasource.getRepository(FileEntity)
    await repository.update(fileUuid, {
      validatedAt: new Date(),
    })
  }

  async createHash({
    fileUuid,
    algorithm,
    hash,
  }: {
    fileUuid: string
    algorithm: HashingAlgorithm
    hash: string
  }): Promise<HashEntity> {
    const repository = this.datasource.getRepository(HashEntity)
    return repository.save({
      fileUuid,
      algorithm,
      value: hash,
      validatedAt: new Date(),
    })
  }

  async updateHashValidity(
    fileUuid: string,
    algorithm: HashingAlgorithm
  ): Promise<void> {
    const repository = this.datasource.getRepository(HashEntity)
    await repository.update(
      {
        fileUuid,
        algorithm: algorithm,
      },
      {
        validatedAt: new Date(),
      }
    )
  }

  async findFile(path: string): Promise<FileEntity | null> {
    const repository = this.datasource.getRepository(FileEntity)

    return await repository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.hashes', 'hash')
      .where('file.path = :path', {path})
      .getOne()
  }

  async findFilesBySize(size: number): Promise<FileEntity[]> {
    const repository = this.datasource.getRepository(FileEntity)

    return await repository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.hashes', 'hash')
      .where('file.size = :size', {size})
      .getMany()
  }

  async findFilesByExifDate(exifDate: string): Promise<FileEntity[]> {
    const repository = this.datasource.getRepository(FileEntity)

    return await repository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.hashes', 'hash')
      .where('file.exifDate = :exifDate', {exifDate})
      .getMany()
  }

  async findFilesByPrefix(prefix: string): Promise<FileEntity[]> {
    const repository = this.datasource.getRepository(FileEntity)

    return await repository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.hashes', 'hash')
      .where('file.basename LIKE :prefix', {prefix: `${prefix}%`})
      .getMany()
  }

  async findAll(): Promise<FileEntity[]> {
    const repository = this.datasource.getRepository(FileEntity)

    return await repository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.hashes', 'hash')
      .getMany()
  }

  async findByValidityInPath({
    count,
    path,
  }: {
    count: number
    path: string
  }): Promise<FileEntity[]> {
    const repository = this.datasource.getRepository(FileEntity)

    return await repository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.hashes', 'hash')
      .where('file.path like :path', {path: `${path}%`})
      .take(count)
      .orderBy('file.validatedAt')
      .getMany()
  }

  async totalSize(): Promise<number> {
    const rawResult = await this.datasource
      .getRepository(FileEntity)
      .createQueryBuilder('file')
      .select('SUM(file.size)', 'total_size')
      .getRawOne<{total_size: number}>()

    return rawResult!.total_size
  }

  async countFiles(): Promise<number> {
    const repository = this.datasource.getRepository(FileEntity)
    return await repository.count()
  }

  async countFilesInPath({path}: {path: string}): Promise<number> {
    const repository = this.datasource.getRepository(FileEntity)
    return await repository.count({
      where: {
        path: Like(`${path}%`),
      },
    })
  }

  async countHashes(algorithm?: HashingAlgorithm): Promise<number> {
    const repository = this.datasource.getRepository(HashEntity)
    return await repository.count(algorithm ? {where: {algorithm}} : undefined)
  }

  async duplicates(): Promise<FileEntity[]> {
    const repository = this.datasource.getRepository(FileEntity)

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
