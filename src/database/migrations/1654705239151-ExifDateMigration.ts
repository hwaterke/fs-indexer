import {MigrationInterface, QueryRunner} from 'typeorm'

export class ExifDateMigration1654705239151 implements MigrationInterface {
  name = 'ExifDateMigration1654705239151'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "file_entity" ADD "exif_date" varchar`)
    await queryRunner.query(
      `ALTER TABLE "file_entity" RENAME COLUMN "validatedAt" TO "validated_at"`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "file_entity" DROP "exif_date"`)
    await queryRunner.query(
      `ALTER TABLE "file_entity" RENAME COLUMN "validated_at" TO "validatedAt"`
    )
  }
}
