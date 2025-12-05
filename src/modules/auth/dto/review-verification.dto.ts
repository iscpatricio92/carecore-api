import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '../../../entities/practitioner-verification.entity';

/**
 * Review Status Enum
 * Status values for reviewing a verification
 */
export enum ReviewStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Review Verification DTO
 * Request DTO for reviewing a practitioner verification
 */
export class ReviewVerificationDto {
  @ApiProperty({
    description: 'Review decision',
    enum: ReviewStatus,
    example: ReviewStatus.APPROVED,
  })
  @IsEnum(ReviewStatus)
  status: ReviewStatus;

  @ApiPropertyOptional({
    description: 'Reason for rejection (required if status is rejected)',
    example: 'Document quality is insufficient',
    maxLength: 1000,
  })
  @ValidateIf((o) => o.status === ReviewStatus.REJECTED)
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

/**
 * Review Verification Response DTO
 * Response DTO for reviewing a practitioner verification
 */
export class ReviewVerificationResponseDto {
  @ApiProperty({
    description: 'Verification ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  verificationId: string;

  @ApiProperty({
    description: 'Updated status',
    enum: VerificationStatus,
    example: VerificationStatus.APPROVED,
  })
  status: VerificationStatus;

  @ApiProperty({
    description: 'ID of the admin who reviewed the verification',
    example: 'admin-user-id',
  })
  reviewedBy: string;

  @ApiProperty({
    description: 'Timestamp when the verification was reviewed',
    example: '2025-01-27T10:00:00Z',
  })
  reviewedAt: string;

  @ApiProperty({
    description: 'Success message',
    example: 'Verification approved successfully',
  })
  message: string;
}

/**
 * List Verifications Query DTO
 * Query parameters for listing practitioner verifications
 */
export class ListVerificationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by verification status',
    enum: VerificationStatus,
    example: VerificationStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;

  @ApiPropertyOptional({
    description: 'Page number (1-based indexing)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
    maximum: 100,
    example: 10,
  })
  @IsOptional()
  limit?: number = 10;
}

/**
 * Verification Detail Response DTO
 * Response DTO for getting verification details
 */
export class VerificationDetailResponseDto {
  @ApiProperty({
    description: 'Verification ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'FHIR Practitioner ID',
    example: 'practitioner-123',
  })
  practitionerId: string;

  @ApiPropertyOptional({
    description: 'Keycloak User ID',
    example: 'keycloak-user-id',
  })
  keycloakUserId?: string | null;

  @ApiProperty({
    description: 'Type of document submitted',
    enum: ['cedula', 'licencia'],
    example: 'cedula',
  })
  documentType: 'cedula' | 'licencia';

  @ApiProperty({
    description: 'Path to the stored document',
    example: 'practitioner-123/cedula_1234567890_abc123.pdf',
  })
  documentPath: string;

  @ApiProperty({
    description: 'Current verification status',
    enum: VerificationStatus,
    example: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @ApiPropertyOptional({
    description: 'ID of the admin who reviewed the verification',
    example: 'admin-user-id',
  })
  reviewedBy?: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when the verification was reviewed',
    example: '2025-01-27T10:00:00Z',
  })
  reviewedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Reason for rejection (if rejected)',
    example: 'Document quality is insufficient',
  })
  rejectionReason?: string | null;

  @ApiPropertyOptional({
    description: 'Additional information provided by the practitioner',
    example: 'License expires in 6 months',
  })
  additionalInfo?: string | null;

  @ApiProperty({
    description: 'Timestamp when the verification was created',
    example: '2025-01-25T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the verification was last updated',
    example: '2025-01-27T10:00:00Z',
  })
  updatedAt: Date;
}

/**
 * List Verifications Response DTO
 * Response DTO for listing practitioner verifications
 */
export class ListVerificationsResponseDto {
  @ApiProperty({
    description: 'List of verifications',
    type: [VerificationDetailResponseDto],
  })
  data: VerificationDetailResponseDto[];

  @ApiProperty({
    description: 'Total number of verifications matching the filters',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;
}
