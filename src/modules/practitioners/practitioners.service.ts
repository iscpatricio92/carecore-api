import { Practitioner } from '@/common/interfaces/fhir.interface';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class PractitionersService {
  private practitioners: Practitioner[] = [];

  create(practitioner: Practitioner): Practitioner {
    const newPractitioner: Practitioner = {
      ...practitioner,
      resourceType: 'Practitioner',
      id: practitioner.id || randomUUID(),
      meta: {
        ...practitioner.meta,
        lastUpdated: new Date().toISOString(),
        versionId: '1',
      },
    };
    this.practitioners.push(newPractitioner);
    return newPractitioner;
  }

  findAll() {
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: this.practitioners.length,
      entry: this.practitioners.map((practitioner) => ({
        fullUrl: `urn:uuid:${practitioner.id}`,
        resource: practitioner,
      })),
    };
  }

  findOne(id: string): Practitioner {
    const practitioner = this.practitioners.find((p) => p.id === id);
    if (!practitioner) {
      throw new NotFoundException(`Practitioner with ID ${id} not found`);
    }
    return practitioner;
  }
}
