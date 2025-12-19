import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Encounter, FHIR_RESOURCE_TYPES } from '@carecore/shared';

/**
 * Encounter Entity
 * Stores FHIR Encounter resources in PostgreSQL using JSONB
 *
 * Strategy: Store complete FHIR resource as JSONB for flexibility
 * Indexed fields: id, resourceType, status, subject for common queries
 *
 * @description
 * This entity stores Encounter resources following FHIR R4 specification.
 * The complete FHIR resource is stored as JSONB to maintain flexibility
 * while allowing indexed queries on commonly accessed fields like status
 * and subject reference.
 *
 * @example
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "resourceType": "Encounter",
 *   "fhirResource": { ... },
 *   "status": "finished",
 *   "encounterId": "encounter-789",
 *   "subjectReference": "Patient/123",
 *   "createdAt": "2024-01-15T10:00:00Z",
 *   "updatedAt": "2024-01-15T10:00:00Z",
 *   "deletedAt": null
 * }
 */
@Entity('encounters')
export class EncounterEntity {
  /**
   * Primary key (UUID)
   * Auto-generated unique identifier for the database record
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * FHIR resource type
   * Always 'Encounter' for this entity
   * Used for filtering and type checking
   */
  @Column({ type: 'varchar', length: 50, default: FHIR_RESOURCE_TYPES.ENCOUNTER })
  resourceType!: string;

  /**
   * Complete FHIR Encounter resource stored as JSONB
   * Contains all Encounter data according to FHIR R4 specification
   * @see https://www.hl7.org/fhir/encounter.html
   */
  @Column({ type: 'jsonb', nullable: true, name: 'fhirResource' })
  fhirResource!: Encounter;

  /**
   * Encounter status extracted from fhirResource.status
   * Used for indexing and filtering by status
   * Values: planned, arrived, triaged, in-progress, onleave, finished, cancelled, entered-in-error, unknown
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  status!: string;

  /**
   * Encounter identifier extracted from fhirResource.id
   * Used for indexing and quick lookups
   * Maps to the FHIR resource ID (not the database UUID)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  encounterId!: string;

  /**
   * Patient reference extracted from fhirResource.subject.reference
   * Used for indexing and querying encounters by patient
   * Format: "Patient/{id}"
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  subjectReference!: string;

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
