import { Encounter } from '@carecore/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class EncountersService {
  private encounters: Encounter[] = [];

  create(encounter: Encounter): Encounter {
    const newEncounter: Encounter = {
      ...encounter,
      resourceType: 'Encounter',
      id: encounter.id || randomUUID(),
      meta: {
        ...encounter.meta,
        lastUpdated: new Date().toISOString(),
        versionId: '1',
      },
    };
    this.encounters.push(newEncounter);
    return newEncounter;
  }

  findAll() {
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: this.encounters.length,
      entry: this.encounters.map((encounter) => ({
        fullUrl: `urn:uuid:${encounter.id}`,
        resource: encounter,
      })),
    };
  }

  findOne(id: string): Encounter {
    const encounter = this.encounters.find((e) => e.id === id);
    if (!encounter) {
      throw new NotFoundException(`Encounter with ID ${id} not found`);
    }
    return encounter;
  }
}
