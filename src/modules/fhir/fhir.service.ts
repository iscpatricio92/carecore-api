import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PinoLogger } from 'nestjs-pino';

import { Patient, Practitioner, Encounter } from '../../common/interfaces/fhir.interface';
import { CreatePatientDto, UpdatePatientDto } from '../../common/dto/fhir-patient.dto';
import {
  CreatePractitionerDto,
  UpdatePractitionerDto,
} from '../../common/dto/fhir-practitioner.dto';
import { CreateEncounterDto, UpdateEncounterDto } from '../../common/dto/fhir-encounter.dto';
import { FhirErrorService } from '../../common/services/fhir-error.service';

/**
 * FHIR service for managing FHIR R4 resources
 * Currently implements basic in-memory operations
 * TODO: Integrate with database and HAPI FHIR if needed
 */
@Injectable()
export class FhirService {
  // Temporary in-memory storage (replace with database)
  private patients: Map<string, Patient> = new Map();
  private practitioners: Map<string, Practitioner> = new Map();
  private encounters: Map<string, Encounter> = new Map();

  constructor(
    private configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(FhirService.name);
  }

  getCapabilityStatement() {
    const baseUrl =
      this.configService.get<string>('FHIR_BASE_URL') || 'http://localhost:3000/api/fhir';

    return {
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: new Date().toISOString(),
      publisher: 'CareCore',
      kind: 'instance',
      software: {
        name: 'CareCore API',
        version: '1.0.0',
      },
      implementation: {
        url: baseUrl,
        description: 'CareCore FHIR R4 API',
      },
      fhirVersion: '4.0.1',
      format: ['application/fhir+json', 'application/json'],
      rest: [
        {
          mode: 'server',
          resource: [
            {
              type: 'Patient',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
                { code: 'update' },
                { code: 'delete' },
              ],
              searchParam: [
                { name: 'name', type: 'string' },
                { name: 'identifier', type: 'token' },
              ],
            },
            {
              type: 'Practitioner',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
                { code: 'update' },
                { code: 'delete' },
              ],
              searchParam: [
                { name: 'name', type: 'string' },
                { name: 'identifier', type: 'token' },
              ],
            },
            {
              type: 'Encounter',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
                { code: 'update' },
                { code: 'delete' },
              ],
              searchParam: [
                { name: 'subject', type: 'reference' },
                { name: 'status', type: 'token' },
                { name: 'date', type: 'date' },
              ],
            },
          ],
        },
      ],
    };
  }

  /**
   * Creates a new Patient
   */
  async createPatient(createPatientDto: CreatePatientDto): Promise<Patient> {
    const patientId = uuidv4();
    const now = new Date().toISOString();

    const patient: Patient = {
      resourceType: 'Patient',
      id: patientId,
      meta: {
        versionId: '1',
        lastUpdated: now,
      },
      ...createPatientDto,
    };

    this.patients.set(patientId, patient);
    this.logger.info({ patientId }, 'Patient created');

    return patient;
  }

  /**
   * Gets a Patient by ID
   */
  async getPatient(id: string): Promise<Patient> {
    const patient = this.patients.get(id);

    if (!patient) {
      // Throw NotFoundException - will be converted to OperationOutcome by filter
      throw new NotFoundException(FhirErrorService.createNotFoundError('Patient', id));
    }

    return patient;
  }

  /**
   * Searches Patients with optional filters
   */
  async searchPatients(params: {
    page?: number;
    limit?: number;
    name?: string;
    identifier?: string;
  }): Promise<{ total: number; entries: Patient[] }> {
    const { page = 1, limit = 10, name, identifier } = params;
    let results = Array.from(this.patients.values());

    // Filter by name
    if (name) {
      const searchName = name.toLowerCase();
      results = results.filter((patient) => {
        return patient.name?.some((n) => {
          const fullName = `${n.given?.join(' ') || ''} ${n.family || ''}`.toLowerCase();
          return fullName.includes(searchName);
        });
      });
    }

    // Filter by identifier
    if (identifier) {
      results = results.filter((patient) => {
        return patient.identifier?.some((id) => id.value === identifier);
      });
    }

    // Pagination
    const total = results.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const entries = results.slice(start, end);

    this.logger.debug({ total, page, limit }, 'Patients searched');

    return { total, entries };
  }

  /**
   * Updates an existing Patient
   */
  async updatePatient(id: string, updatePatientDto: UpdatePatientDto): Promise<Patient> {
    const existingPatient = this.patients.get(id);

    if (!existingPatient) {
      throw new NotFoundException(FhirErrorService.createNotFoundError('Patient', id));
    }

    const now = new Date().toISOString();
    const currentVersion = parseInt(existingPatient.meta?.versionId || '1', 10);

    const updatedPatient: Patient = {
      ...existingPatient,
      ...updatePatientDto,
      id, // Ensure ID doesn't change
      meta: {
        ...existingPatient.meta,
        versionId: String(currentVersion + 1),
        lastUpdated: now,
      },
    };

    this.patients.set(id, updatedPatient);
    this.logger.info({ patientId: id }, 'Patient updated');

    return updatedPatient;
  }

  /**
   * Deletes a Patient
   */
  async deletePatient(id: string): Promise<void> {
    const patient = this.patients.get(id);

    if (!patient) {
      throw new NotFoundException(FhirErrorService.createNotFoundError('Patient', id));
    }

    this.patients.delete(id);
    this.logger.info({ patientId: id }, 'Patient deleted');
  }

  // ========== Practitioner Methods ==========

  /**
   * Creates a new Practitioner
   */
  async createPractitioner(createPractitionerDto: CreatePractitionerDto): Promise<Practitioner> {
    const practitionerId = uuidv4();
    const now = new Date().toISOString();

    const practitioner: Practitioner = {
      resourceType: 'Practitioner',
      id: practitionerId,
      meta: {
        versionId: '1',
        lastUpdated: now,
      },
      ...createPractitionerDto,
    };

    this.practitioners.set(practitionerId, practitioner);
    this.logger.info({ practitionerId }, 'Practitioner created');

    return practitioner;
  }

  /**
   * Gets a Practitioner by ID
   */
  async getPractitioner(id: string): Promise<Practitioner> {
    const practitioner = this.practitioners.get(id);

    if (!practitioner) {
      throw new NotFoundException(FhirErrorService.createNotFoundError('Practitioner', id));
    }

    return practitioner;
  }

  /**
   * Searches Practitioners with optional filters
   */
  async searchPractitioners(params: {
    page?: number;
    limit?: number;
    name?: string;
    identifier?: string;
  }): Promise<{ total: number; entries: Practitioner[] }> {
    const { page = 1, limit = 10, name, identifier } = params;
    let results = Array.from(this.practitioners.values());

    // Filter by name
    if (name) {
      const searchName = name.toLowerCase();
      results = results.filter((practitioner) => {
        return practitioner.name?.some((n) => {
          const fullName = `${n.given?.join(' ') || ''} ${n.family || ''}`.toLowerCase();
          return fullName.includes(searchName);
        });
      });
    }

    // Filter by identifier
    if (identifier) {
      results = results.filter((practitioner) => {
        return practitioner.identifier?.some((id) => id.value === identifier);
      });
    }

    // Pagination
    const total = results.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const entries = results.slice(start, end);

    this.logger.debug({ total, page, limit }, 'Practitioners searched');

    return { total, entries };
  }

  /**
   * Updates an existing Practitioner
   */
  async updatePractitioner(
    id: string,
    updatePractitionerDto: UpdatePractitionerDto,
  ): Promise<Practitioner> {
    const existingPractitioner = this.practitioners.get(id);

    if (!existingPractitioner) {
      throw new NotFoundException(FhirErrorService.createNotFoundError('Practitioner', id));
    }

    const now = new Date().toISOString();
    const currentVersion = parseInt(existingPractitioner.meta?.versionId || '1', 10);

    const updatedPractitioner: Practitioner = {
      ...existingPractitioner,
      ...updatePractitionerDto,
      id, // Ensure ID doesn't change
      meta: {
        ...existingPractitioner.meta,
        versionId: String(currentVersion + 1),
        lastUpdated: now,
      },
    };

    this.practitioners.set(id, updatedPractitioner);
    this.logger.info({ practitionerId: id }, 'Practitioner updated');

    return updatedPractitioner;
  }

  /**
   * Deletes a Practitioner
   */
  async deletePractitioner(id: string): Promise<void> {
    const practitioner = this.practitioners.get(id);

    if (!practitioner) {
      throw new NotFoundException(FhirErrorService.createNotFoundError('Practitioner', id));
    }

    this.practitioners.delete(id);
    this.logger.info({ practitionerId: id }, 'Practitioner deleted');
  }

  // ========== Encounter Methods ==========

  /**
   * Creates a new Encounter
   */
  async createEncounter(createEncounterDto: CreateEncounterDto): Promise<Encounter> {
    const encounterId = uuidv4();
    const now = new Date().toISOString();

    const encounter: Encounter = {
      resourceType: 'Encounter',
      id: encounterId,
      meta: {
        versionId: '1',
        lastUpdated: now,
      },
      ...createEncounterDto,
    };

    this.encounters.set(encounterId, encounter);
    this.logger.info({ encounterId }, 'Encounter created');

    return encounter;
  }

  /**
   * Gets an Encounter by ID
   */
  async getEncounter(id: string): Promise<Encounter> {
    const encounter = this.encounters.get(id);

    if (!encounter) {
      throw new NotFoundException(FhirErrorService.createNotFoundError('Encounter', id));
    }

    return encounter;
  }

  /**
   * Searches Encounters with optional filters
   */
  async searchEncounters(params: {
    page?: number;
    limit?: number;
    subject?: string; // Patient reference
    status?: string;
    date?: string;
  }): Promise<{ total: number; entries: Encounter[] }> {
    const { page = 1, limit = 10, subject, status, date } = params;
    let results = Array.from(this.encounters.values());

    // Filter by subject (Patient reference)
    if (subject) {
      results = results.filter((encounter) => {
        return (
          encounter.subject?.reference === subject ||
          encounter.subject?.reference?.endsWith(`/${subject}`)
        );
      });
    }

    // Filter by status
    if (status) {
      results = results.filter((encounter) => encounter.status === status);
    }

    // Filter by date (within period)
    if (date) {
      const searchDateStr = date.split('T')[0]; // Get YYYY-MM-DD part
      results = results.filter((encounter) => {
        if (!encounter.period?.start) return false;
        const encounterDateStr = encounter.period.start.split('T')[0]; // Get YYYY-MM-DD part
        return encounterDateStr === searchDateStr;
      });
    }

    // Pagination
    const total = results.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const entries = results.slice(start, end);

    this.logger.debug({ total, page, limit }, 'Encounters searched');

    return { total, entries };
  }

  /**
   * Updates an existing Encounter
   */
  async updateEncounter(id: string, updateEncounterDto: UpdateEncounterDto): Promise<Encounter> {
    const existingEncounter = this.encounters.get(id);

    if (!existingEncounter) {
      throw new NotFoundException(FhirErrorService.createNotFoundError('Encounter', id));
    }

    const now = new Date().toISOString();
    const currentVersion = parseInt(existingEncounter.meta?.versionId || '1', 10);

    const updatedEncounter: Encounter = {
      ...existingEncounter,
      ...updateEncounterDto,
      id, // Ensure ID doesn't change
      meta: {
        ...existingEncounter.meta,
        versionId: String(currentVersion + 1),
        lastUpdated: now,
      },
    };

    this.encounters.set(id, updatedEncounter);
    this.logger.info({ encounterId: id }, 'Encounter updated');

    return updatedEncounter;
  }

  /**
   * Deletes an Encounter
   */
  async deleteEncounter(id: string): Promise<void> {
    const encounter = this.encounters.get(id);

    if (!encounter) {
      throw new NotFoundException(FhirErrorService.createNotFoundError('Encounter', id));
    }

    this.encounters.delete(id);
    this.logger.info({ encounterId: id }, 'Encounter deleted');
  }
}
