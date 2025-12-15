import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add keycloak_user_id to patients table
 *
 * This migration adds a keycloak_user_id column to the patients table
 * to link Patient resources with Keycloak user accounts for authorization.
 */
export class AddKeycloakUserIdToPatients1733391890153 implements MigrationInterface {
  name = 'AddKeycloakUserIdToPatients1733391890153';

  /**
   * Helper function to check if a column exists
   */
  private async columnExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = '${tableName}'
        AND column_name = '${columnName}'
      ) as exists`,
    );
    return result[0]?.exists === true;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columnExists = await this.columnExists(queryRunner, 'patients', 'keycloak_user_id');

    if (!columnExists) {
      await queryRunner.query(`
        ALTER TABLE "patients"
        ADD COLUMN "keycloak_user_id" VARCHAR(255) NULL
      `);

      // Create index for efficient lookups
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_patients_keycloak_user_id"
        ON "patients" ("keycloak_user_id")
        WHERE "deletedAt" IS NULL
      `);

      this.log('Added keycloak_user_id column to patients table');
    } else {
      this.log('Column keycloak_user_id already exists in patients table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columnExists = await this.columnExists(queryRunner, 'patients', 'keycloak_user_id');

    if (columnExists) {
      // Drop index first
      await queryRunner.query(`
        DROP INDEX IF EXISTS "IDX_patients_keycloak_user_id"
      `);

      // Drop column
      await queryRunner.query(`
        ALTER TABLE "patients"
        DROP COLUMN "keycloak_user_id"
      `);

      this.log('Removed keycloak_user_id column from patients table');
    }
  }

  private log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }
}
