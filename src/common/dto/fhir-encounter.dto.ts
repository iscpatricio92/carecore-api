import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Encounter } from '../interfaces/fhir.interface';

export class EncounterParticipantDto {
  @ApiPropertyOptional({
    description: 'Role of participant',
    example: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
          code: 'ATND',
          display: 'attending',
        },
      ],
    },
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  type?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Period of participation',
  })
  @IsOptional()
  period?: {
    start?: string;
    end?: string;
  };

  @ApiProperty({
    description: 'Reference to Practitioner or other participant',
    example: {
      reference: 'Practitioner/123',
      display: 'Dr. Smith',
    },
  })
  @IsObject()
  individual: {
    reference: string;
    display?: string;
  };
}

/**
 * DTO for creating a FHIR Encounter
 * MVP: Essential fields only (status, class, subject, participant, period)
 */
export class CreateEncounterDto implements Partial<Encounter> {
  @ApiPropertyOptional({ description: 'Encounter identifiers' })
  @IsOptional()
  @IsArray()
  identifier?: Array<{
    system?: string;
    value?: string;
  }>;

  @ApiProperty({
    description: 'Status of the encounter',
    enum: [
      'planned',
      'arrived',
      'triaged',
      'in-progress',
      'onleave',
      'finished',
      'cancelled',
      'entered-in-error',
      'unknown',
    ],
    example: 'finished',
  })
  @IsEnum([
    'planned',
    'arrived',
    'triaged',
    'in-progress',
    'onleave',
    'finished',
    'cancelled',
    'entered-in-error',
    'unknown',
  ])
  status:
    | 'planned'
    | 'arrived'
    | 'triaged'
    | 'in-progress'
    | 'onleave'
    | 'finished'
    | 'cancelled'
    | 'entered-in-error'
    | 'unknown';

  @ApiProperty({
    description: 'Classification of encounter (e.g., outpatient, emergency)',
    example: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory',
    },
  })
  @IsObject()
  class: {
    system?: string;
    code: string;
    display?: string;
  };

  @ApiPropertyOptional({
    description: 'Type of encounter (e.g., consultation, follow-up)',
  })
  @IsOptional()
  @IsArray()
  type?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;

  @ApiProperty({
    description: 'Reference to the Patient',
    example: {
      reference: 'Patient/123',
      display: 'John Doe',
    },
  })
  @IsObject()
  subject: {
    reference: string;
    display?: string;
  };

  @ApiPropertyOptional({
    description: 'Participants in the encounter',
    type: [EncounterParticipantDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EncounterParticipantDto)
  participant?: EncounterParticipantDto[];

  @ApiProperty({
    description: 'Period of the encounter',
    example: {
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T10:30:00Z',
    },
  })
  @IsObject()
  period: {
    start: string;
    end?: string;
  };

  @ApiPropertyOptional({
    description: 'Reason for encounter',
  })
  @IsOptional()
  @IsArray()
  reasonCode?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Priority of the encounter',
  })
  @IsOptional()
  priority?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
}

/**
 * DTO for updating a FHIR Encounter
 */
export class UpdateEncounterDto extends CreateEncounterDto {
  @ApiPropertyOptional({ description: 'FHIR resource ID' })
  @IsOptional()
  @IsString()
  id?: string;
}
