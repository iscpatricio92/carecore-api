import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { DocumentStorageService } from './document-storage.service';

// Mock fs module
jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
}));

// Mock path module
jest.mock('node:path', () => ({
  ...jest.requireActual('node:path'),
  isAbsolute: jest.fn(),
  join: jest.fn((...args) => args.join('/')),
  extname: jest.fn((filename) => {
    const ext = filename.split('.').pop();
    return ext && ext !== filename ? `.${ext}` : '';
  }),
  relative: jest.fn((from, to) => to.replace(from + '/', '')),
}));

describe('DocumentStorageService', () => {
  let service: DocumentStorageService;
  let configService: jest.Mocked<ConfigService>;
  let mockLogger: jest.Mocked<PinoLogger>;

  const mockMkdir = fs.mkdir as jest.Mock;
  const mockWriteFile = fs.writeFile as jest.Mock;
  const mockUnlink = fs.unlink as jest.Mock;
  const mockPathIsAbsolute = path.isAbsolute as jest.Mock;
  const mockPathJoin = path.join as jest.Mock;
  const mockPathExtname = path.extname as jest.Mock;
  const mockPathRelative = path.relative as jest.Mock;

  beforeEach(async () => {
    mockLogger = {
      setContext: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    // Default config values
    configService.get.mockImplementation((key: string) => {
      if (key === 'VERIFICATION_DOCUMENTS_PATH') {
        return 'storage/verifications';
      }
      if (key === 'MAX_DOCUMENT_SIZE') {
        return 10 * 1024 * 1024; // 10MB
      }
      return undefined;
    });

    mockPathIsAbsolute.mockReturnValue(false);
    mockPathJoin.mockImplementation((...args) => args.join('/'));
    mockPathExtname.mockImplementation((filename: string) => {
      const ext = filename.split('.').pop();
      return ext && ext !== filename ? `.${ext}` : '';
    });
    mockPathRelative.mockImplementation((from: string, to: string) => to.replace(from + '/', ''));

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentStorageService,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<DocumentStorageService>(DocumentStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFile', () => {
    it('should validate file with correct size and MIME type', () => {
      const file = {
        size: 1024 * 1024, // 1MB
        mimetype: 'application/pdf',
        originalname: 'document.pdf',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      expect(() => service.validateFile(file)).not.toThrow();
    });

    it('should throw BadRequestException when file size exceeds maximum', () => {
      const file = {
        size: 11 * 1024 * 1024, // 11MB (exceeds 10MB limit)
        mimetype: 'application/pdf',
        originalname: 'document.pdf',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      expect(() => service.validateFile(file)).toThrow(BadRequestException);
      expect(() => service.validateFile(file)).toThrow(/File size exceeds maximum/);
    });

    it('should throw BadRequestException when MIME type is not allowed', () => {
      const file = {
        size: 1024,
        mimetype: 'application/zip',
        originalname: 'document.zip',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      expect(() => service.validateFile(file)).toThrow(BadRequestException);
      expect(() => service.validateFile(file)).toThrow(/File type not allowed/);
    });

    it('should throw BadRequestException when file extension is not allowed', () => {
      const file = {
        size: 1024,
        mimetype: 'application/pdf',
        originalname: 'document.exe',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      expect(() => service.validateFile(file)).toThrow(BadRequestException);
      expect(() => service.validateFile(file)).toThrow(/File extension not allowed/);
    });

    it('should accept valid image files', () => {
      const file = {
        size: 1024,
        mimetype: 'image/jpeg',
        originalname: 'photo.jpg',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      expect(() => service.validateFile(file)).not.toThrow();
    });

    it('should accept PNG files', () => {
      const file = {
        size: 1024,
        mimetype: 'image/png',
        originalname: 'image.png',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      expect(() => service.validateFile(file)).not.toThrow();
    });
  });

  describe('storeVerificationDocument', () => {
    it('should store verification document successfully', async () => {
      const file = {
        size: 1024,
        mimetype: 'application/pdf',
        originalname: 'cedula.pdf',
        buffer: Buffer.from('test content'),
      } as Express.Multer.File;

      const practitionerId = 'practitioner-123';
      const documentType = 'cedula';

      mockPathRelative.mockReturnValue('practitioner-123/cedula_1234567890_abc123.pdf');

      const result = await service.storeVerificationDocument(file, practitionerId, documentType);

      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('practitioner-123'), {
        recursive: true,
      });
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when file validation fails', async () => {
      const file = {
        size: 11 * 1024 * 1024, // Too large
        mimetype: 'application/pdf',
        originalname: 'document.pdf',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      await expect(
        service.storeVerificationDocument(file, 'practitioner-123', 'cedula'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate unique filename with hash and timestamp', async () => {
      const file = {
        size: 1024,
        mimetype: 'application/pdf',
        originalname: 'cedula.pdf',
        buffer: Buffer.from('test content'),
      } as Express.Multer.File;

      await service.storeVerificationDocument(file, 'practitioner-123', 'cedula');

      const writeFileCall = mockWriteFile.mock.calls[0];
      expect(writeFileCall[0]).toMatch(/cedula_\d+_[a-f0-9]+\.pdf/);
      expect(writeFileCall[1]).toEqual(file.buffer);
    });

    it('should use extension from MIME type when originalname has no extension', async () => {
      const file = {
        size: 1024,
        mimetype: 'image/jpeg',
        originalname: 'photo.jpg', // Has valid extension for validation
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      // First call for validateFile (returns .jpg), second call in storeVerificationDocument returns empty
      mockPathExtname.mockReturnValueOnce('.jpg').mockReturnValueOnce('');

      await service.storeVerificationDocument(file, 'practitioner-123', 'licencia');

      const writeFileCall = mockWriteFile.mock.calls[0];
      expect(writeFileCall[0]).toMatch(/licencia_\d+_[a-f0-9]+\.jpg/);
    });
  });

  describe('getDocumentPath', () => {
    it('should return full path to document', () => {
      const relativePath = 'practitioner-123/cedula_123.pdf';
      const result = service.getDocumentPath(relativePath);

      expect(mockPathJoin).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      const relativePath = 'practitioner-123/cedula_123.pdf';

      await service.deleteDocument(relativePath);

      expect(mockUnlink).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith({ path: relativePath }, 'Document deleted');
    });

    it('should handle file not found error gracefully', async () => {
      const relativePath = 'practitioner-123/nonexistent.pdf';
      const error = new Error('ENOENT: no such file or directory');
      mockUnlink.mockRejectedValue(error);

      await service.deleteDocument(relativePath);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          path: relativePath,
          error: expect.any(Error),
        }),
        'Failed to delete document',
      );
    });

    it('should handle other errors gracefully', async () => {
      const relativePath = 'practitioner-123/document.pdf';
      const error = new Error('Permission denied');
      mockUnlink.mockRejectedValue(error);

      await service.deleteDocument(relativePath);

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      // Service is already initialized in beforeEach
      // This test verifies that the service was created successfully
      expect(service).toBeDefined();
      expect(mockLogger.setContext).toHaveBeenCalledWith(DocumentStorageService.name);
    });
  });
});
