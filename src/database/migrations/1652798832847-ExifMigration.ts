import {MigrationInterface, QueryRunner} from 'typeorm'

export class ExifMigration1652798832847 implements MigrationInterface {
  name = 'ExifMigration1652798832847'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "file_entity" ADD "make" varchar`)
    await queryRunner.query(`ALTER TABLE "file_entity" ADD "model" varchar`)
    await queryRunner.query(`ALTER TABLE "file_entity" ADD "width" integer`)
    await queryRunner.query(`ALTER TABLE "file_entity" ADD "height" integer`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "file_entity" DROP "make"`)
    await queryRunner.query(`ALTER TABLE "file_entity" DROP "model"`)
    await queryRunner.query(`ALTER TABLE "file_entity" DROP "width"`)
    await queryRunner.query(`ALTER TABLE "file_entity" DROP "height"`)
  }
}
