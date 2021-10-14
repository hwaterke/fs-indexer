import {Column, Entity, JoinColumn, ManyToOne, PrimaryColumn} from 'typeorm'
import {FileEntity} from './FileEntity'
import {HashingAlgorithm} from '../../services/HashingService'

@Entity()
export class HashEntity {
  @ManyToOne(() => FileEntity, (file) => file.hashes, {primary: true})
  @JoinColumn({name: 'file_uuid'})
  file!: FileEntity

  @PrimaryColumn('varchar')
  algorithm!: HashingAlgorithm

  @Column()
  value!: string
}
