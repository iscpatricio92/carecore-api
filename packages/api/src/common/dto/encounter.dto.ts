import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EncounterListItemDto as SharedEncounterListItemDto,
  EncounterDetailDto as SharedEncounterDetailDto,
} from '@carecore/shared';

/**
 * Simple Encounter DTO for mobile/web clients
 * Extracted directly from EncounterEntity without FHIR complexity
 *
 * Note: Base types are defined in @carecore/shared
 * These classes add NestJS/Swagger decorators for API documentation
 */
export class EncounterDto implements SharedEncounterDetailDto {
  @ApiProperty({ description: 'Encounter ID (database UUID)' })
  id!: string;

  @ApiProperty({ description: 'Encounter identifier (FHIR resource ID)' })
  encounterId!: string;

  @ApiProperty({ description: 'Encounter status' })
  status!: string;

  @ApiProperty({ description: 'Patient reference (e.g., Patient/123)' })
  subjectReference!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Complete FHIR resource (if needed)' })
  fhirResource?: unknown;
}

export class EncounterListItemDto implements SharedEncounterListItemDto {
  @ApiProperty({ description: 'Encounter ID' })
  id!: string;

  @ApiProperty({ description: 'Encounter identifier' })
  encounterId!: string;

  @ApiProperty({ description: 'Status' })
  status!: string;

  @ApiProperty({ description: 'Patient reference' })
  subjectReference!: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;
}

export class EncounterDetailDto extends EncounterDto {
  // Inherits all fields from EncounterDto
}

// Re-export shared types for convenience
export type { EncounterListItemDto as EncounterListItemDtoType } from '@carecore/shared';
export type { EncounterDetailDto as EncounterDetailDtoType } from '@carecore/shared';
export type { EncountersListResponse } from '@carecore/shared';
