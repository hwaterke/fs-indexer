import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'
import {FileEntity} from './FileEntity'
import {HashingAlgorithm} from '../../services/HashingService'

@Entity()
export class HashEntity {
  @ManyToOne(() => FileEntity, (file) => file.hashes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({name: 'file_uuid'})
  file!: FileEntity

  @PrimaryColumn({name: 'file_uuid'})
  fileUuid!: string

  @PrimaryColumn('varchar')
  algorithm!: HashingAlgorithm

  @Column()
  value!: string

  @CreateDateColumn({name: 'created_at'})
  createdAt!: Date

  @UpdateDateColumn({name: 'updated_at'})
  updatedAt!: Date

  // Last time that data was validated
  @Column('datetime')
  validatedAt!: Date
}
