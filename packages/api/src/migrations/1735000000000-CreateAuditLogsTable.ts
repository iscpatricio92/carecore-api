import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create audit_logs table
 *
 * This migration creates the audit_logs table for immutable audit trail
 * of all FHIR resource access and modifications.
 */
export class CreateAuditLogsTable1735000000000 implements MigrationInterface {
  name = 'CreateAuditLogsTable1735000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('audit_logs');

    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'audit_logs',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            {
              name: 'action',
              type: 'varchar',
              length: '50',
              isNullable: false,
            },
            {
              name: 'resourceType',
              type: 'varchar',
              length: '50',
              isNullable: false,
            },
            {
              name: 'resourceId',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'userId',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'userRoles',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'ipAddress',
              type: 'varchar',
              length: '45',
              isNullable: true,
            },
            {
              name: 'userAgent',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'requestMethod',
              type: 'varchar',
              length: '10',
              isNullable: true,
            },
            {
              name: 'requestPath',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'statusCode',
              type: 'integer',
              isNullable: true,
            },
            {
              name: 'changes',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'errorMessage',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'createdAt',
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
        'audit_logs',
        new TableIndex({
          name: 'IDX_audit_logs_resourceType_resourceId',
          columnNames: ['resourceType', 'resourceId'],
        }),
      );

      await queryRunner.createIndex(
        'audit_logs',
        new TableIndex({
          name: 'IDX_audit_logs_userId',
          columnNames: ['userId'],
        }),
      );

      await queryRunner.createIndex(
        'audit_logs',
        new TableIndex({
          name: 'IDX_audit_logs_action',
          columnNames: ['action'],
        }),
      );

      await queryRunner.createIndex(
        'audit_logs',
        new TableIndex({
          name: 'IDX_audit_logs_createdAt',
          columnNames: ['createdAt'],
        }),
      );

      await queryRunner.createIndex(
        'audit_logs',
        new TableIndex({
          name: 'IDX_audit_logs_resourceType_action_createdAt',
          columnNames: ['resourceType', 'action', 'createdAt'],
        }),
      );

      this.log('Created audit_logs table with indexes');
    } else {
      this.log('Table audit_logs already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('audit_logs');

    if (tableExists) {
      // Drop indexes first
      await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_resourceType_action_createdAt');
      await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_createdAt');
      await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_action');
      await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_userId');
      await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_resourceType_resourceId');

      // Drop table
      await queryRunner.dropTable('audit_logs');

      this.log('Dropped audit_logs table');
    }
  }

  private log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }
}
