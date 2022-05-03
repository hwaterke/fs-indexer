import {MigrationInterface, QueryRunner} from 'typeorm'

export class InitialMigration1651605236637 implements MigrationInterface {
  name = 'InitialMigration1651605236637'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "file_entity" (
        "uuid" varchar PRIMARY KEY NOT NULL,
        "path" varchar NOT NULL,
        "size" bigint NOT NULL,
        "ctime" bigint NOT NULL,
        "mtime" bigint NOT NULL,
        "basename" varchar NOT NULL,
        "extension" varchar NOT NULL,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        "validatedAt" datetime NOT NULL,
        CONSTRAINT "UQ_492bdbc663862a2b928e96f0e4d" UNIQUE ("path")
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "hash_entity" (
        "file_uuid" varchar NOT NULL,
        "algorithm" varchar NOT NULL,
        "value" varchar NOT NULL,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        "validatedAt" datetime NOT NULL,
        CONSTRAINT "FK_c980331e5d9d709c69c85d3e86d" FOREIGN KEY ("file_uuid") REFERENCES "file_entity" ("uuid") ON DELETE CASCADE ON UPDATE NO ACTION,
        PRIMARY KEY ("file_uuid", "algorithm")
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "hash_entity"`)
    await queryRunner.query(`DROP TABLE "file_entity"`)
  }
}
