import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Enable pgcrypto extension
 *
 * This migration enables the pgcrypto extension in PostgreSQL,
 * which provides cryptographic functions for encrypting sensitive data.
 *
 * pgcrypto provides:
 * - Encryption/decryption functions (pgp_sym_encrypt, pgp_sym_decrypt)
 * - Hashing functions (digest, hmac)
 * - Random data generation (gen_random_bytes)
 *
 * Note: The extension must be created in the database where it will be used.
 * This migration should be run before any migrations that use encryption.
 */
export class EnablePgcrypto1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgcrypto extension
    // This extension is available in PostgreSQL by default (contrib package)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Verify that the extension was created successfully
    const result = await queryRunner.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
      ) as exists;
    `);

    if (!result[0]?.exists) {
      throw new Error(
        'Failed to create pgcrypto extension. Please ensure PostgreSQL contrib package is installed.',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the extension
    // WARNING: This will fail if any objects depend on the extension
    await queryRunner.query(`DROP EXTENSION IF EXISTS "pgcrypto";`);
  }
}
