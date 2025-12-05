#!/usr/bin/env ts-node
/**
 * Migration Generator Helper
 *
 * Generates a new migration file with the current timestamp to ensure proper ordering.
 * This script ensures that all migrations use the current timestamp instead of manual values.
 *
 * Usage:
 *   npm run migration:create -- MigrationName
 *   or
 *   ts-node scripts/generate-migration.ts MigrationName
 */

import * as fs from 'fs';
import * as path from 'path';

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('❌ Error: Migration name is required');
  console.log('\nUsage:');
  console.log('  npm run migration:create -- MigrationName');
  console.log('  or');
  console.log('  ts-node scripts/generate-migration.ts MigrationName');
  process.exit(1);
}

// Generate timestamp (milliseconds since epoch)
const timestamp = Date.now();

// Convert migration name to class name format
// Example: "AddUserTable" -> "AddUserTable"
const className = migrationName
  .split(/[-_]/)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join('');

// Generate file name
const fileName = `${timestamp}-${migrationName}.ts`;

// Migration template
const migrationTemplate = `import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: ${migrationName}
 *
 * Generated on: ${new Date().toISOString()}
 * Timestamp: ${timestamp}
 */
export class ${className}${timestamp} implements MigrationInterface {
  name = '${className}${timestamp}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // TODO: Implement migration logic
    this.log('Starting migration...');

    // Example:
    // await queryRunner.query(\`
    //   ALTER TABLE "table_name"
    //   ADD COLUMN "column_name" VARCHAR(255) NULL
    // \`);

    this.log('Migration completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // TODO: Implement rollback logic
    this.log('Rolling back migration...');

    // Example:
    // await queryRunner.query(\`
    //   ALTER TABLE "table_name"
    //   DROP COLUMN "column_name"
    // \`);

    this.log('Rollback completed');
  }

  private log(message: string): void {
    console.log(\`[\${this.name}] \${message}\`);
  }
}
`;

// Get migrations directory
const migrationsDir = path.join(__dirname, '../src/migrations');

// Ensure migrations directory exists
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// Full file path
const filePath = path.join(migrationsDir, fileName);

// Check if file already exists
if (fs.existsSync(filePath)) {
  console.error(`❌ Error: Migration file already exists: ${fileName}`);
  process.exit(1);
}

// Write migration file
fs.writeFileSync(filePath, migrationTemplate, 'utf8');

console.log('✅ Migration file created successfully!');
console.log(`📁 Location: ${filePath}`);
console.log(`📝 Class name: ${className}${timestamp}`);
console.log(`⏰ Timestamp: ${timestamp} (${new Date(timestamp).toISOString()})`);
console.log('\n⚠️  Remember to:');
console.log('  1. Implement the migration logic in the `up()` method');
console.log('  2. Implement the rollback logic in the `down()` method');
console.log('  3. Test the migration before committing');
console.log('  4. Run the migration: npm run migration:run');
