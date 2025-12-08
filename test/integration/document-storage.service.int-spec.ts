import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';

import { DocumentStorageService } from '@/modules/auth/services/document-storage.service';

describe('DocumentStorageService (integration)', () => {
  let tmpDir: string;
  let service: DocumentStorageService;

  const createConfigStub = (overrides?: Partial<Record<string, unknown>>): ConfigService => {
    return {
      get: (key: string) => {
        if (key === 'VERIFICATION_DOCUMENTS_PATH') return tmpDir;
        if (key === 'MAX_DOCUMENT_SIZE') return overrides?.MAX_DOCUMENT_SIZE ?? 10 * 1024 * 1024;
        return overrides?.[key];
      },
    } as unknown as ConfigService;
  };

  const loggerStub = {
    setContext: () => undefined,
    debug: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    info: () => undefined,
  } as unknown as PinoLogger;

  const createFile = (opts?: Partial<Express.Multer.File>): Express.Multer.File => {
    const buffer = Buffer.from('hello world');
    return {
      fieldname: 'file',
      originalname: opts?.originalname ?? 'doc.pdf',
      encoding: '7bit',
      mimetype: opts?.mimetype ?? 'application/pdf',
      size: opts?.size ?? buffer.length,
      buffer: opts?.buffer ?? buffer,
      stream: Readable.from(opts?.buffer ?? buffer),
      destination: '',
      filename: '',
      path: '',
    };
  };

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-storage-'));
    service = new DocumentStorageService(createConfigStub(), loggerStub);
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should store a document and return a relative path', async () => {
    const file = createFile();
    const relativePath = await service.storeVerificationDocument(file, 'practitioner-1', 'cedula');

    expect(relativePath).toContain('practitioner-1');
    expect(path.isAbsolute(relativePath)).toBe(false);

    const fullPath = path.join(tmpDir, relativePath);
    const stored = await fs.readFile(fullPath, 'utf8');
    expect(stored).toBe('hello world');
  });

  it('should reject files exceeding max size', async () => {
    const tinyService = new DocumentStorageService(
      createConfigStub({ MAX_DOCUMENT_SIZE: 1 }),
      loggerStub,
    );
    const file = createFile({ size: 2, buffer: Buffer.from('ab') });

    expect(() => tinyService.validateFile(file)).toThrow(BadRequestException);
  });

  it('deleteDocument should not throw if file is missing', async () => {
    await expect(service.deleteDocument('non-existing.pdf')).resolves.not.toThrow();
  });
});
