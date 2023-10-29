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
  @Column('datetime', {name: 'validated_at'})
  validatedAt!: Date

  @Column({nullable: true})
  make?: string

  @Column({nullable: true})
  model?: string

  @Column('int', {nullable: true})
  width?: number

  @Column('int', {nullable: true})
  height?: number

  @Column({name: 'exif_date', nullable: true})
  exifDate?: string

  @Column({name: 'live_photo_source', nullable: true})
  livePhotoSource?: string

  @Column({name: 'live_photo_target', nullable: true})
  livePhotoTarget?: string

  @Column({name: 'latitude', nullable: true})
  latitude?: number

  @Column({name: 'longitude', nullable: true})
  longitude?: number
}
