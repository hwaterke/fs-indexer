import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import {HashEntity} from './HashEntity'

@Entity()
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string

  @Column({unique: true})
  path!: string

  @Column('bigint')
  size!: number

  // Last time some metadata related to the file was changed
  @Column('bigint')
  ctime!: number

  // Last time the file’s content was modified
  @Column('bigint')
  mtime!: number

  @Column()
  basename!: string

  @Column()
  extension!: string

  @OneToMany(() => HashEntity, (hash) => hash.file)
  hashes!: HashEntity[]

  @CreateDateColumn({name: 'created_at'})
  createdAt!: Date

  @UpdateDateColumn({name: 'updated_at'})
  updatedAt!: Date

  // Last time that data was validated
  @Column('datetime')
  validatedAt!: Date
}
