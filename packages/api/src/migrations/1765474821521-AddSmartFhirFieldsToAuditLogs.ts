import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * Migration: AddSmartFhirFieldsToAuditLogs
 *
 * Adds SMART on FHIR specific fields to audit_logs table:
 * - clientId: ID of the external SMART on FHIR application
 * - clientName: Human-readable name of the application
 * - launchContext: Launch context (patient, encounter, etc.) as JSON
 * - scopes: OAuth2 scopes used for the request
 *
 * Generated on: 2025-12-11T17:40:21.521Z
 * Timestamp: 1765474821521
 */
export class AddSmartFhirFieldsToAuditLogs1765474821521 implements MigrationInterface {
  name = 'AddSmartFhirFieldsToAuditLogs1765474821521';

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.log('Starting migration...');

    const table = await queryRunner.getTable('audit_logs');
    if (!table) {
      this.log('Table audit_logs does not exist, skipping migration');
      return;
    }

    // Add clientId column
    const clientIdColumn = table.findColumnByName('clientId');
    if (!clientIdColumn) {
      await queryRunner.query(`
        ALTER TABLE "audit_logs"
        ADD COLUMN "clientId" VARCHAR(255) NULL
      `);
      this.log('Added clientId column');

      // Create index for clientId
      await queryRunner.createIndex(
        'audit_logs',
        new TableIndex({
          name: 'IDX_audit_logs_clientId',
          columnNames: ['clientId'],
        }),
      );
      this.log('Created index on clientId');
    } else {
      this.log('Column clientId already exists');
    }

    // Add clientName column
    const clientNameColumn = table.findColumnByName('clientName');
    if (!clientNameColumn) {
      await queryRunner.query(`
        ALTER TABLE "audit_logs"
        ADD COLUMN "clientName" VARCHAR(255) NULL
      `);
      this.log('Added clientName column');
    } else {
      this.log('Column clientName already exists');
    }

    // Add launchContext column
    const launchContextColumn = table.findColumnByName('launchContext');
    if (!launchContextColumn) {
      await queryRunner.query(`
        ALTER TABLE "audit_logs"
        ADD COLUMN "launchContext" JSONB NULL
      `);
      this.log('Added launchContext column');
    } else {
      this.log('Column launchContext already exists');
    }

    // Add scopes column
    const scopesColumn = table.findColumnByName('scopes');
    if (!scopesColumn) {
      await queryRunner.query(`
        ALTER TABLE "audit_logs"
        ADD COLUMN "scopes" JSONB NULL
      `);
      this.log('Added scopes column');
    } else {
      this.log('Column scopes already exists');
    }

    this.log('Migration completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.log('Rolling back migration...');

    const table = await queryRunner.getTable('audit_logs');
    if (!table) {
      this.log('Table audit_logs does not exist, skipping rollback');
      return;
    }

    // Drop index first
    const clientIdIndex = table.indices.find((idx) => idx.name === 'IDX_audit_logs_clientId');
    if (clientIdIndex) {
      await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_clientId');
      this.log('Dropped index on clientId');
    }

    // Drop columns
    const scopesColumn = table.findColumnByName('scopes');
    if (scopesColumn) {
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "scopes"`);
      this.log('Dropped scopes column');
    }

    const launchContextColumn = table.findColumnByName('launchContext');
    if (launchContextColumn) {
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "launchContext"`);
      this.log('Dropped launchContext column');
    }

    const clientNameColumn = table.findColumnByName('clientName');
    if (clientNameColumn) {
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "clientName"`);
      this.log('Dropped clientName column');
    }

    const clientIdColumn = table.findColumnByName('clientId');
    if (clientIdColumn) {
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "clientId"`);
      this.log('Dropped clientId column');
    }

    this.log('Rollback completed');
  }

  private log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }
}
