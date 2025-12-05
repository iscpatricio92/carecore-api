import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

/**
 * Encryption Service
 *
 * Provides encryption and decryption functionality using PostgreSQL's pgcrypto extension.
 * This service encrypts sensitive data at the database level, ensuring data is encrypted
 * at rest in the database.
 *
 * Security considerations:
 * - Encryption key must be stored securely (environment variable, KMS, etc.)
 * - Key rotation should be implemented for production
 * - Encrypted data cannot be searched directly (consider searchable encryption for search fields)
 * - Performance impact: encryption/decryption happens at database level
 *
 * Usage:
 * ```typescript
 * const encrypted = await encryptionService.encrypt('sensitive data');
 * const decrypted = await encryptionService.decrypt(encrypted);
 * ```
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptionKey: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    // Get encryption key from environment
    // In production, this should come from a Key Management Service (KMS)
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

    if (!this.encryptionKey) {
      this.logger.warn(
        'ENCRYPTION_KEY not set. Encryption will fail. Set ENCRYPTION_KEY in your environment variables.',
      );
    }

    if (this.encryptionKey && this.encryptionKey.length < 32) {
      this.logger.warn(
        'ENCRYPTION_KEY is too short. For security, use a key of at least 32 characters.',
      );
    }
  }

  /**
   * Encrypt a string value using pgcrypto
   *
   * @param plaintext - The plaintext string to encrypt
   * @returns The encrypted value (base64 encoded)
   * @throws Error if encryption fails or key is not set
   */
  async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) {
      return plaintext;
    }

    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured. Set ENCRYPTION_KEY environment variable.');
    }

    try {
      // Use pgcrypto's pgp_sym_encrypt function
      // This encrypts data using a symmetric key (AES encryption)
      // The result is returned as bytea, which we convert to base64 for storage
      const result = await this.dataSource.query(
        `SELECT encode(pgp_sym_encrypt($1, $2), 'base64') as encrypted`,
        [plaintext, this.encryptionKey],
      );

      if (!result || !result[0]?.encrypted) {
        throw new Error('Encryption failed: no result returned');
      }

      return result[0].encrypted;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt a string value using pgcrypto
   *
   * @param encryptedValue - The encrypted value (base64 encoded)
   * @returns The decrypted plaintext string
   * @throws Error if decryption fails or key is incorrect
   */
  async decrypt(encryptedValue: string): Promise<string> {
    if (!encryptedValue) {
      return encryptedValue;
    }

    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured. Set ENCRYPTION_KEY environment variable.');
    }

    try {
      // Use pgcrypto's pgp_sym_decrypt function
      // Decode from base64 and decrypt using the symmetric key
      const result = await this.dataSource.query(
        `SELECT pgp_sym_decrypt(decode($1, 'base64'), $2) as decrypted`,
        [encryptedValue, this.encryptionKey],
      );

      if (!result || result[0]?.decrypted === null) {
        throw new Error('Decryption failed: incorrect key or corrupted data');
      }

      return result[0].decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Check if pgcrypto extension is available
   *
   * @returns true if pgcrypto is installed and available
   */
  async isPgcryptoAvailable(): Promise<boolean> {
    try {
      const result = await this.dataSource.query(`
        SELECT EXISTS(
          SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
        ) as exists;
      `);

      return result[0]?.exists === true;
    } catch (error) {
      this.logger.error('Failed to check pgcrypto availability', error);
      return false;
    }
  }

  /**
   * Generate a random encryption key (for development/testing)
   * WARNING: Do not use in production. Use a proper key management system.
   *
   * @param length - Length of the key in bytes (default: 32)
   * @returns Base64 encoded random key
   */
  async generateRandomKey(length = 32): Promise<string> {
    try {
      const result = await this.dataSource.query(
        `SELECT encode(gen_random_bytes($1), 'base64') as key`,
        [length],
      );

      return result[0]?.key;
    } catch (error) {
      this.logger.error('Failed to generate random key', error);
      throw new Error(`Failed to generate random key: ${error.message}`);
    }
  }
}
