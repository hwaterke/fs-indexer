import {MigrationInterface, QueryRunner} from 'typeorm'

export class LivePhotoMigration1691586419841 implements MigrationInterface {
  name = 'LivePhotoMigration1691586419841'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE file_entity ADD live_photo_source varchar`
    )
    await queryRunner.query(
      `ALTER TABLE file_entity ADD live_photo_target varchar`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "file_entity"
        RENAME TO "temporary_file_entity"
    `)
    await queryRunner.query(`
        CREATE TABLE "file_entity"
        (
            "uuid"         varchar PRIMARY KEY NOT NULL,
            "path"         varchar             NOT NULL,
            "size"         bigint              NOT NULL,
            "ctime"        bigint              NOT NULL,
            "mtime"        bigint              NOT NULL,
            "basename"     varchar             NOT NULL,
            "extension"    varchar             NOT NULL,
            "created_at"   datetime            NOT NULL DEFAULT (datetime('now')),
            "updated_at"   datetime            NOT NULL DEFAULT (datetime('now')),
            "validated_at" datetime            NOT NULL,
            "make"         varchar,
            "model"        varchar,
            "width"        integer,
            "height"       integer,
            "exif_date"    varchar,
            CONSTRAINT "UQ_492bdbc663862a2b928e96f0e4d" UNIQUE ("path")
        )
    `)
    await queryRunner.query(`
      INSERT INTO "file_entity"("uuid",
                                "path",
                                "size",
                                "ctime",
                                "mtime",
                                "basename",
                                "extension",
                                "created_at",
                                "updated_at",
                                "validated_at",
                                "make",
                                "model",
                                "width",
                                "height",
                                "exif_date")
      SELECT "uuid",
             "path",
             "size",
             "ctime",
             "mtime",
             "basename",
             "extension",
             "created_at",
             "updated_at",
             "validated_at",
             "make",
             "model",
             "width",
             "height",
             "exif_date"
      FROM "temporary_file_entity"
    `)
    await queryRunner.query(`
      DROP TABLE "temporary_file_entity"
    `)
  }
}
