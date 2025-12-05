import { DocumentReference } from '@/common/interfaces/fhir.interface';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class DocumentsService {
  private documents: DocumentReference[] = [];

  create(document: DocumentReference): DocumentReference {
    const newDocument: DocumentReference = {
      ...document,
      resourceType: 'DocumentReference',
      id: document.id || randomUUID(),
      meta: {
        ...document.meta,
        lastUpdated: new Date().toISOString(),
        versionId: '1',
      },
    };
    this.documents.push(newDocument);
    return newDocument;
  }

  findAll() {
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: this.documents.length,
      entry: this.documents.map((document) => ({
        fullUrl: `urn:uuid:${document.id}`,
        resource: document,
      })),
    };
  }

  findOne(id: string): DocumentReference {
    const document = this.documents.find((d) => d.id === id);
    if (!document) {
      throw new NotFoundException(`DocumentReference with ID ${id} not found`);
    }
    return document;
  }
}
