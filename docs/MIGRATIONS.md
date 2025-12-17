# Database Migrations Guide

This guide explains how to work with database migrations in the CareCore API project.

## Overview

We use TypeORM migrations to manage database schema changes. Migrations ensure that:

- Database schema changes are version-controlled
- Changes can be applied consistently across environments
- Rollbacks are possible if needed
- Team members can sync their local databases easily

## Creating Migrations

### Method 1: Generate from Entity Changes (Recommended)

When you modify entities, TypeORM can automatically generate migration files:

```bash
npm run migration:generate -- src/migrations/MigrationName
```

**Example:**

```bash
npm run migration:generate -- src/migrations/AddEmailToUsers
```

This will:

- Compare your entities with the current database schema
- Generate a migration file with the necessary SQL changes
- Use the current timestamp automatically

### Method 2: Create Empty Migration Template

For manual migrations or complex changes:

```bash
npm run migration:create -- MigrationName
```

**Example:**

```bash
npm run migration:create -- AddIndexToPatients
```

This creates a template file with:

- Current timestamp (ensures proper ordering)
- `up()` method for applying changes
- `down()` method for rollback
- Helper logging methods

**Important:** The script automatically uses the current timestamp, so migrations are always ordered correctly.

## Running Migrations

### Manual Execution

Run all pending migrations:

```bash
npm run migration:run
```

### Automatic Execution on Startup (Optional)

You can configure the application to automatically run pending migrations on startup by setting:

```env
RUN_MIGRATIONS_ON_STARTUP=true
```

**⚠️ Important Considerations:**

1. **Development:** Can be convenient for local development
2. **Staging:** Useful for testing migration automation
3. **Production:** **NOT RECOMMENDED** - Migrations should be run manually or via CI/CD

**Why not in production?**

- Migrations can be destructive
- You want full control over when schema changes are applied
- Better to test migrations in staging first
- CI/CD pipelines provide better visibility and rollback capabilities

### Checking Migration Status

View which migrations have been executed:

```bash
npm run migration:show
```

## Reverting Migrations

To rollback the last migration:

```bash
npm run migration:revert
```

**⚠️ Warning:** Only revert if you're sure the migration hasn't been applied to production or shared environments.

## Migration Best Practices

### 1. Timestamp Ordering

- ✅ **DO:** Use `npm run migration:create` or `npm run migration:generate` (uses current timestamp)
- ❌ **DON'T:** Manually set timestamps in migration files
- ✅ **DO:** Let TypeORM generate timestamps automatically

### 2. Migration Naming

Use descriptive names that explain what the migration does:

- ✅ `AddKeycloakUserIdToPatients`
- ✅ `CreateAuditLogsTable`
- ✅ `AddIndexToPatientEmail`
- ❌ `Migration1`
- ❌ `UpdateTable`

### 3. Idempotency

Make migrations idempotent (safe to run multiple times):

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  const columnExists = await this.columnExists(queryRunner, 'patients', 'email');

  if (!columnExists) {
    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD COLUMN "email" VARCHAR(255) NULL
    `);
  }
}
```

### 4. Testing

Always test migrations:

1. **Test locally:**

   ```bash
   npm run migration:run
   ```

2. **Test rollback:**

   ```bash
   npm run migration:revert
   ```

3. **Test in staging** before production

### 5. Review Before Committing

- Review generated SQL in migration files
- Ensure `up()` and `down()` methods are correct
- Test the migration locally
- Document any breaking changes

## Migration File Structure

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationName1735000000000 implements MigrationInterface {
  name = 'MigrationName1735000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Apply changes
    this.log('Starting migration...');
    // ... SQL statements
    this.log('Migration completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback changes
    this.log('Rolling back migration...');
    // ... SQL statements
    this.log('Rollback completed');
  }

  private log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }
}
```

## Common Migration Patterns

### Adding a Column

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  const columnExists = await this.columnExists(queryRunner, 'table_name', 'column_name');

  if (!columnExists) {
    await queryRunner.query(`
      ALTER TABLE "table_name"
      ADD COLUMN "column_name" VARCHAR(255) NULL
    `);
  }
}
```

### Creating an Index

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.createIndex(
    'table_name',
    new TableIndex({
      name: 'IDX_table_name_column',
      columnNames: ['column_name'],
    }),
  );
}
```

### Creating a Table

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.createTable(
    new Table({
      name: 'table_name',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid',
        },
        // ... more columns
      ],
    }),
    true,
  );
}
```

## Troubleshooting

### Migration Already Exists

If you see "Migration already exists", check:

- The migration has already been run
- Use `npm run migration:show` to see executed migrations

### Migration Failed

1. Check the error message
2. Review the migration SQL
3. Fix the migration file
4. If needed, manually fix the database state
5. Re-run the migration

### Timestamp Conflicts

If you have timestamp conflicts:

- Use `npm run migration:create` which always uses current timestamp
- Never manually edit timestamps in existing migrations

## Environment Variables

| Variable                    | Description                    | Default | Recommended                        |
| --------------------------- | ------------------------------ | ------- | ---------------------------------- |
| `RUN_MIGRATIONS_ON_STARTUP` | Auto-run migrations on startup | `false` | `false` (production), `true` (dev) |

## Related Documentation

- [TypeORM Migrations](https://typeorm.io/migrations)
- [Database Configuration](./DATABASE.md)
- [Environment Variables](../ENV_VARIABLES.md)
