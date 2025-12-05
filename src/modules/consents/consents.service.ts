import { Consent } from '@/common/interfaces/fhir.interface';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class ConsentsService {
  private consents: Consent[] = [];

  create(consent: Consent): Consent {
    const newConsent: Consent = {
      ...consent,
      resourceType: 'Consent',
      id: consent.id || randomUUID(),
      meta: {
        ...consent.meta,
        lastUpdated: new Date().toISOString(),
        versionId: '1',
      },
    };
    this.consents.push(newConsent);
    return newConsent;
  }

  findAll() {
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: this.consents.length,
      entry: this.consents.map((consent) => ({
        fullUrl: `urn:uuid:${consent.id}`,
        resource: consent,
      })),
    };
  }

  findOne(id: string): Consent {
    const consent = this.consents.find((c) => c.id === id);
    if (!consent) {
      throw new NotFoundException(`Consent with ID ${id} not found`);
    }
    return consent;
  }
}
