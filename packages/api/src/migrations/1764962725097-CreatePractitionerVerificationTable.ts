import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create practitioner_verifications table
 *
 * This migration creates the practitioner_verifications table for tracking
 * practitioner identity verification requests and their status.
 */
export class CreatePractitionerVerificationTable1764962725097 implements MigrationInterface {
  name = 'CreatePractitionerVerificationTable1764962725097';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('practitioner_verifications');

    if (!tableExists) {
      // Create enum type for document type
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "practitioner_verification_document_type_enum" AS ENUM('cedula', 'licencia');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create enum type for status
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "practitioner_verification_status_enum" AS ENUM('pending', 'approved', 'rejected', 'expired');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await queryRunner.createTable(
        new Table({
          name: 'practitioner_verifications',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            {
              name: 'practitionerId',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'keycloakUserId',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'documentType',
              type: 'enum',
              enum: ['cedula', 'licencia'],
              enumName: 'practitioner_verification_document_type_enum',
              isNullable: false,
            },
            {
              name: 'documentPath',
              type: 'varchar',
              length: '500',
              isNullable: false,
            },
            {
              name: 'status',
              type: 'enum',
              enum: ['pending', 'approved', 'rejected', 'expired'],
              enumName: 'practitioner_verification_status_enum',
              default: "'pending'",
              isNullable: false,
            },
            {
              name: 'reviewedBy',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'reviewedAt',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'rejectionReason',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'additionalInfo',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
            {
              name: 'updatedAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      // Create indexes for efficient queries
      await queryRunner.createIndex(
        'practitioner_verifications',
        new TableIndex({
          name: 'IDX_practitioner_verifications_practitionerId',
          columnNames: ['practitionerId'],
        }),
      );

      await queryRunner.createIndex(
        'practitioner_verifications',
        new TableIndex({
          name: 'IDX_practitioner_verifications_keycloakUserId',
          columnNames: ['keycloakUserId'],
        }),
      );

      await queryRunner.createIndex(
        'practitioner_verifications',
        new TableIndex({
          name: 'IDX_practitioner_verifications_status',
          columnNames: ['status'],
        }),
      );

      await queryRunner.createIndex(
        'practitioner_verifications',
        new TableIndex({
          name: 'IDX_practitioner_verifications_createdAt',
          columnNames: ['createdAt'],
        }),
      );

      await queryRunner.createIndex(
        'practitioner_verifications',
        new TableIndex({
          name: 'IDX_practitioner_verifications_practitionerId_status',
          columnNames: ['practitionerId', 'status'],
        }),
      );

      this.log('Created practitioner_verifications table with indexes');
    } else {
      this.log('Table practitioner_verifications already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('practitioner_verifications');

    if (tableExists) {
      // Drop indexes first
      await queryRunner.dropIndex(
        'practitioner_verifications',
        'IDX_practitioner_verifications_practitionerId_status',
      );
      await queryRunner.dropIndex(
        'practitioner_verifications',
        'IDX_practitioner_verifications_createdAt',
      );
      await queryRunner.dropIndex(
        'practitioner_verifications',
        'IDX_practitioner_verifications_status',
      );
      await queryRunner.dropIndex(
        'practitioner_verifications',
        'IDX_practitioner_verifications_keycloakUserId',
      );
      await queryRunner.dropIndex(
        'practitioner_verifications',
        'IDX_practitioner_verifications_practitionerId',
      );

      // Drop table
      await queryRunner.dropTable('practitioner_verifications');

      // Drop enum types
      await queryRunner.query(`DROP TYPE IF EXISTS "practitioner_verification_status_enum"`);
      await queryRunner.query(`DROP TYPE IF EXISTS "practitioner_verification_document_type_enum"`);

      this.log('Dropped practitioner_verifications table');
    }
  }

  private log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }
}
