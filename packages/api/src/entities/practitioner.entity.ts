import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Practitioner, FHIR_RESOURCE_TYPES } from '@carecore/shared';

/**
 * Practitioner Entity
 * Stores FHIR Practitioner resources in PostgreSQL using JSONB
 *
 * Strategy: Store complete FHIR resource as JSONB for flexibility
 * Indexed fields: id, resourceType, active for common queries
 *
 * @description
 * This entity stores Practitioner resources following FHIR R4 specification.
 * The complete FHIR resource is stored as JSONB to maintain flexibility
 * while allowing indexed queries on commonly accessed fields.
 *
 * @example
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "resourceType": "Practitioner",
 *   "fhirResource": { ... },
 *   "active": true,
 *   "practitionerId": "practitioner-456",
 *   "createdAt": "2024-01-15T10:00:00Z",
 *   "updatedAt": "2024-01-15T10:00:00Z",
 *   "deletedAt": null
 * }
 */
@Entity('practitioners')
export class PractitionerEntity {
  /**
   * Primary key (UUID)
   * Auto-generated unique identifier for the database record
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * FHIR resource type
   * Always 'Practitioner' for this entity
   * Used for filtering and type checking
   */
  @Column({ type: 'varchar', length: 50, default: FHIR_RESOURCE_TYPES.PRACTITIONER })
  resourceType!: string;

  /**
   * Complete FHIR Practitioner resource stored as JSONB
   * Contains all Practitioner data according to FHIR R4 specification
   * @see https://www.hl7.org/fhir/practitioner.html
   */
  @Column({ type: 'jsonb', nullable: true, name: 'fhirResource' })
  fhirResource!: Practitioner;

  /**
   * Active status flag
   * Extracted from fhirResource.active for efficient querying
   * Indicates whether the practitioner record is currently active
   */
  @Column({ type: 'boolean', default: true, nullable: true })
  active!: boolean;

  /**
   * Practitioner identifier extracted from fhirResource.id
   * Used for indexing and quick lookups
   * Maps to the FHIR resource ID (not the database UUID)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  practitionerId!: string;

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
