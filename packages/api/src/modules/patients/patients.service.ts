import { Patient } from '@carecore/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class PatientsService {
  private patients: Patient[] = [];

  create(patient: Patient): Patient {
    const newPatient: Patient = {
      ...patient,
      resourceType: 'Patient',
      id: patient.id || randomUUID(),
      meta: {
        ...patient.meta,
        lastUpdated: new Date().toISOString(),
        versionId: '1',
      },
    };
    this.patients.push(newPatient);
    return newPatient;
  }
  findAll() {
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: this.patients.length,
      entry: this.patients.map((patient) => ({
        fullUrl: `urn:uuid:${patient.id}`,
        resource: patient,
      })),
    };
  }

  findOne(id: string): Patient {
    const patient = this.patients.find((p) => p.id === id);
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return patient;
  }
}
