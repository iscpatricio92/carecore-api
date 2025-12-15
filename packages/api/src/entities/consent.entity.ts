import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Consent, FHIR_RESOURCE_TYPES } from '@carecore/shared';

/**
 * Consent Entity
 * Stores FHIR Consent resources in PostgreSQL using JSONB
 *
 * Strategy: Store complete FHIR resource as JSONB for flexibility
 * Indexed fields: id, resourceType, status, patient for common queries
 *
 * @description
 * This entity stores Consent resources following FHIR R4 specification.
 * The complete FHIR resource is stored as JSONB to maintain flexibility
 * while allowing indexed queries on commonly accessed fields like status
 * and patient reference.
 *
 * @example
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "resourceType": "Consent",
 *   "fhirResource": { ... },
 *   "status": "active",
 *   "consentId": "consent-101",
 *   "patientReference": "Patient/123",
 *   "createdAt": "2024-01-15T10:00:00Z",
 *   "updatedAt": "2024-01-15T10:00:00Z",
 *   "deletedAt": null
 * }
 */
@Entity('consents')
export class ConsentEntity {
  /**
   * Primary key (UUID)
   * Auto-generated unique identifier for the database record
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * FHIR resource type
   * Always 'Consent' for this entity
   * Used for filtering and type checking
   */
  @Column({ type: 'varchar', length: 50, default: FHIR_RESOURCE_TYPES.CONSENT })
  resourceType!: string;

  /**
   * Complete FHIR Consent resource stored as JSONB
   * Contains all Consent data according to FHIR R4 specification
   * @see https://www.hl7.org/fhir/consent.html
   */
  @Column({ type: 'jsonb', nullable: true })
  fhirResource!: Consent;

  /**
   * Consent status extracted from fhirResource.status
   * Used for indexing and filtering by status
   * Values: draft, proposed, active, rejected, inactive, entered-in-error
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  status!: string;

  /**
   * Consent identifier extracted from fhirResource.id
   * Used for indexing and quick lookups
   * Maps to the FHIR resource ID (not the database UUID)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  consentId!: string;

  /**
   * Patient reference extracted from fhirResource.patient.reference
   * Used for indexing and querying consents by patient
   * Format: "Patient/{id}"
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  patientReference!: string;

  /**
   * Record creation timestamp
   * Automatically set when the record is first created
   */
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  /**
   * Record last update timestamp
   * Automatically updated when the record is modified
   */
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  /**
   * Soft delete timestamp
   * Set when the record is soft-deleted (null if active)
   * Allows for data recovery and audit trails
   */
  @Column({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
