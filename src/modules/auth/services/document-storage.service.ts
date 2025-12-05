import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Document Storage Service
 *
 * Handles storage of verification documents (cedula, licencia) for practitioners.
 * Documents are stored temporarily on local disk (not committed to git).
 *
 * TODO: Migrate to cloud storage (S3/MinIO) in the future for production.
 */
@Injectable()
export class DocumentStorageService {
  private readonly storageDir: string;
  private readonly maxFileSize: number; // in bytes
  private readonly allowedMimeTypes: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(DocumentStorageService.name);

    // TEMPORARY: Local storage path (not committed to git, see .gitignore)
    // TODO: Migrate to cloud storage (S3/MinIO) for production
    const baseDir =
      this.configService.get<string>('VERIFICATION_DOCUMENTS_PATH') || 'storage/verifications';
    this.storageDir = path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);

    // Max file size: 10MB (default)
    this.maxFileSize = this.configService.get<number>('MAX_DOCUMENT_SIZE') || 10 * 1024 * 1024;

    // Allowed MIME types
    this.allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDir(practitionerId: string): Promise<string> {
    const practitionerDir = path.join(this.storageDir, practitionerId);
    await fs.mkdir(practitionerDir, { recursive: true });
    return practitionerDir;
  }

  /**
   * Validate file before storing
   */
  validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    // Additional validation: check file extension matches MIME type
    const extension = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

    if (!validExtensions.includes(extension)) {
      throw new BadRequestException(
        `File extension not allowed. Allowed extensions: ${validExtensions.join(', ')}`,
      );
    }
  }

  /**
   * Store a verification document
   * @param file Multer file object
   * @param practitionerId Practitioner ID
   * @param documentType Type of document (cedula/licencia)
   * @returns Path to stored file
   */
  async storeVerificationDocument(
    file: Express.Multer.File,
    practitionerId: string,
    documentType: string,
  ): Promise<string> {
    // Validate file
    this.validateFile(file);

    // Ensure storage directory exists
    const practitionerDir = await this.ensureStorageDir(practitionerId);

    // Generate unique filename
    const hash = createHash('sha256').update(file.buffer).digest('hex').substring(0, 8);
    const timestamp = Date.now();
    const extension =
      path.extname(file.originalname) || this.getExtensionFromMimeType(file.mimetype);
    const fileName = `${documentType}_${timestamp}_${hash}${extension}`;

    // Store file
    const filePath = path.join(practitionerDir, fileName);
    await fs.writeFile(filePath, file.buffer);

    this.logger.debug(
      {
        practitionerId,
        documentType,
        fileName,
        size: file.size,
        mimeType: file.mimetype,
      },
      'Verification document stored',
    );

    // Return relative path from storage root
    return path.relative(this.storageDir, filePath);
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };

    return mimeToExt[mimeType] || '.bin';
  }

  /**
   * Get full path to a stored document
   */
  getDocumentPath(relativePath: string): string {
    return path.join(this.storageDir, relativePath);
  }

  /**
   * Delete a stored document (for cleanup)
   */
  async deleteDocument(relativePath: string): Promise<void> {
    const fullPath = this.getDocumentPath(relativePath);
    try {
      await fs.unlink(fullPath);
      this.logger.debug({ path: relativePath }, 'Document deleted');
    } catch (error) {
      // File might not exist, log but don't throw
      this.logger.warn({ path: relativePath, error }, 'Failed to delete document');
    }
  }
}
