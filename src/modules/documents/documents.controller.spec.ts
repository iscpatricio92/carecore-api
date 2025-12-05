import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentReference } from '../../common/interfaces/fhir.interface';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let service: DocumentsService;

  const mockDocumentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: mockDocumentsService,
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    service = module.get<DocumentsService>(DocumentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new document', () => {
      const documentData: DocumentReference = {
        resourceType: 'DocumentReference',
        status: 'current',
        content: [
          {
            attachment: {
              contentType: 'application/pdf',
              url: 'https://example.com/document.pdf',
            },
          },
        ],
      };

      const expectedResult: DocumentReference = {
        ...documentData,
        id: 'test-document-id',
        meta: {
          versionId: '1',
          lastUpdated: new Date().toISOString(),
        },
      };

      mockDocumentsService.create.mockReturnValue(expectedResult);

      const result = controller.create(documentData);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(documentData);
    });
  });

  describe('findAll', () => {
    it('should return all documents', () => {
      const expectedResult = {
        resourceType: 'Bundle',
        type: 'searchset',
        total: 0,
        entry: [],
      };

      mockDocumentsService.findAll.mockReturnValue(expectedResult);

      const result = controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a document by id', () => {
      const documentId = 'test-document-id';
      const expectedResult: DocumentReference = {
        resourceType: 'DocumentReference',
        id: documentId,
        status: 'current',
        content: [
          {
            attachment: {
              contentType: 'application/pdf',
              url: 'https://example.com/document.pdf',
            },
          },
        ],
      };

      mockDocumentsService.findOne.mockReturnValue(expectedResult);

      const result = controller.findOne(documentId);

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith(documentId);
    });
  });
});
