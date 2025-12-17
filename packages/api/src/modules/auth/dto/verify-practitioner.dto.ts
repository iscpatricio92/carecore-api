import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Document Type Enum
 * Types of documents that can be submitted for practitioner verification
 */
export enum DocumentType {
  CEDULA = 'cedula',
  LICENCIA = 'licencia',
}

/**
 * Verify Practitioner DTO
 * Request DTO for practitioner verification submission
 */
export class VerifyPractitionerDto {
  @ApiProperty({
    description: 'FHIR Practitioner ID to verify',
    example: 'practitioner-123',
  })
  @IsString()
  practitionerId!: string;

  @ApiProperty({
    description: 'Type of document being submitted',
    enum: DocumentType,
    example: DocumentType.CEDULA,
  })
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @ApiPropertyOptional({
    description: 'Additional information or notes about the verification request',
    example: 'License expires in 6 months',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalInfo?: string;
}

/**
 * Verify Practitioner Response DTO
 * Response DTO for practitioner verification submission
 */
export class VerifyPractitionerResponseDto {
  @ApiProperty({
    description: 'Verification request ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  verificationId!: string;

  @ApiProperty({
    description: 'Current status of the verification request',
    example: 'pending',
    enum: ['pending', 'approved', 'rejected', 'expired'],
  })
  status!: string;

  @ApiProperty({
    description: 'Success message',
    example: 'Verification request submitted successfully',
  })
  message!: string;

  @ApiProperty({
    description: 'Estimated review time',
    example: '2-3 business days',
  })
  estimatedReviewTime!: string;
}
