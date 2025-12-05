import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Practitioner Verification Status Enum
 */
export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * Practitioner Verification Entity
 *
 * Tracks practitioner identity verification requests and their status.
 * Practitioners submit documents (cedula/licencia) for verification by administrators.
 */
@Entity('practitioner_verifications')
@Index(['practitionerId'])
@Index(['keycloakUserId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['practitionerId', 'status'])
export class PractitionerVerificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  practitionerId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  keycloakUserId: string | null;

  @Column({
    type: 'enum',
    enum: ['cedula', 'licencia'],
  })
  documentType: 'cedula' | 'licencia';

  @Column({ type: 'varchar', length: 500 })
  documentPath: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'text', nullable: true })
  additionalInfo: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
