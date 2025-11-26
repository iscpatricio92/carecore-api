import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PinoLogger } from 'nestjs-pino';

import { Patient } from '../../common/interfaces/fhir.interface';
import { CreatePatientDto, UpdatePatientDto } from '../../common/dto/fhir-patient.dto';
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
              ],
            },
            {
              type: 'Encounter',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
                { code: 'update' },
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
}
