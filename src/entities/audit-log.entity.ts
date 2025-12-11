import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * Audit Log Entity
 * Immutable audit trail for all FHIR resource access and modifications
 *
 * @description
 * This entity stores immutable audit logs for compliance and security purposes.
 * Records are never updated or deleted - they provide a complete audit trail.
 *
 * @example
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "action": "read",
 *   "resourceType": "Patient",
 *   "resourceId": "patient-123",
 *   "userId": "keycloak-user-uuid",
 *   "userRoles": ["patient"],
 *   "ipAddress": "192.168.1.1",
 *   "userAgent": "Mozilla/5.0...",
 *   "requestMethod": "GET",
 *   "requestPath": "/api/fhir/Patient/patient-123",
 *   "statusCode": 200,
 *   "changes": null,
 *   "createdAt": "2024-01-15T10:00:00Z"
 * }
 */
@Entity('audit_logs')
@Index(['resourceType', 'resourceId'])
@Index(['userId'])
@Index(['action'])
@Index(['createdAt'])
@Index(['resourceType', 'action', 'createdAt'])
export class AuditLogEntity {
  /**
   * Primary key (UUID)
   * Auto-generated unique identifier for the audit log record
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Action performed on the resource
   * Values: create, read, update, delete, search
   */
  @Column({ type: 'varchar', length: 50 })
  @Index()
  action: string;

  /**
   * FHIR resource type
   * Examples: Patient, Practitioner, Encounter, Consent, DocumentReference
   */
  @Column({ type: 'varchar', length: 50 })
  @Index()
  resourceType: string;

  /**
   * FHIR resource ID (not database UUID)
   * The identifier of the resource that was accessed/modified
   * Nullable for search/list operations where no specific resource is targeted
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  resourceId: string | null;

  /**
   * Keycloak user ID who performed the action
   * Links to the authenticated user
   * Nullable for unauthenticated requests (should be rare)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  userId: string | null;

  /**
   * User roles at the time of the action
   * Stored as JSON array for audit purposes
   * Example: ["patient"], ["practitioner"], ["admin"]
   */
  @Column({ type: 'jsonb', nullable: true })
  userRoles: string[] | null;

  /**
   * IP address of the client making the request
   * Useful for security analysis and compliance
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  /**
   * User agent string from the HTTP request
   * Identifies the client application/browser
   */
  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  /**
   * HTTP method used for the request
   * Values: GET, POST, PUT, PATCH, DELETE
   */
  @Column({ type: 'varchar', length: 10, nullable: true })
  requestMethod: string | null;

  /**
   * Request path/URL
   * Example: "/api/fhir/Patient/patient-123"
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  requestPath: string | null;

  /**
   * HTTP status code returned
   * Example: 200, 201, 400, 401, 403, 404, 500
   */
  @Column({ type: 'integer', nullable: true })
  statusCode: number | null;

  /**
   * Changes made to the resource (for create/update actions)
   * Stored as JSONB to capture before/after states or new resource data
   * Null for read/delete actions
   */
  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, unknown> | null;

  /**
   * Error message if the action failed
   * Null for successful actions
   */
  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  /**
   * SMART on FHIR: Client ID of the external application
   * Identifies which SMART on FHIR application made the request
   * Extracted from JWT token (azp or aud claim) or request parameters
   * Null for non-SMART on FHIR requests
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  clientId: string | null;

  /**
   * SMART on FHIR: Client name of the external application
   * Human-readable name of the SMART on FHIR application
   * Retrieved from Keycloak client configuration
   * Null for non-SMART on FHIR requests or if name not available
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  clientName: string | null;

  /**
   * SMART on FHIR: Launch context from launch sequence
   * Stores the launch context (patient, encounter, etc.) as JSON
   * Format: { patient?: "Patient/123", encounter?: "Encounter/456", ... }
   * Null for non-launch requests or standalone launches
   */
  @Column({ type: 'jsonb', nullable: true })
  launchContext: Record<string, unknown> | null;

  /**
   * SMART on FHIR: OAuth2 scopes used for the request
   * Stored as JSON array for audit purposes
   * Example: ["patient:read", "patient:write"]
   * Null for non-SMART on FHIR requests
   */
  @Column({ type: 'jsonb', nullable: true })
  scopes: string[] | null;

  /**
   * Record creation timestamp
   * Automatically set when the audit log is created
   * This is the only timestamp - records are immutable
   */
  @CreateDateColumn({ type: 'timestamp' })
  @Index()
  createdAt: Date;
}
