import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Encounter } from '@carecore/shared';

export class EncounterParticipantDto {
  @ApiPropertyOptional({
    description: 'Role of the participant in the encounter',
    example: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
            code: 'ATND',
            display: 'attending',
          },
        ],
        text: 'Attending Physician',
      },
    ],
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
    description: 'Period during which the participant was involved in the encounter',
    example: {
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T10:30:00Z',
    },
  })
  @IsOptional()
  period?: {
    start?: string;
    end?: string;
  };

  @ApiProperty({
    description: 'Reference to Practitioner, Patient, or other participant',
    example: {
      reference: 'Practitioner/123',
      display: 'Dr. Jane Smith',
    },
  })
  @IsObject()
  individual!: {
    reference: string;
    display?: string;
  };
}

/**
 * DTO for creating a FHIR Encounter
 * MVP: Essential fields only (status, class, subject, participant, period)
 *
 * @example
 * {
 *   "status": "finished",
 *   "class": {
 *     "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
 *     "code": "AMB",
 *     "display": "ambulatory"
 *   },
 *   "subject": {
 *     "reference": "Patient/123",
 *     "display": "John Doe"
 *   },
 *   "period": {
 *     "start": "2024-01-15T10:00:00Z",
 *     "end": "2024-01-15T10:30:00Z"
 *   },
 *   "participant": [{
 *     "type": [{
 *       "coding": [{
 *         "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
 *         "code": "ATND",
 *         "display": "attending"
 *       }]
 *     }],
 *     "individual": {
 *       "reference": "Practitioner/456",
 *       "display": "Dr. Jane Smith"
 *     }
 *   }]
 * }
 */
export class CreateEncounterDto implements Partial<Encounter> {
  @ApiPropertyOptional({
    description: 'Business identifiers for this encounter',
    example: [
      {
        system: 'http://example.com/encounter-ids',
        value: 'ENC-2024-001',
      },
    ],
  })
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
  status!:
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
  class!: {
    system?: string;
    code: string;
    display?: string;
  };

  @ApiPropertyOptional({
    description: 'Specific type of encounter (e.g., consultation, follow-up, emergency)',
    example: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: 'AMB',
            display: 'ambulatory',
          },
        ],
        text: 'Outpatient Consultation',
      },
    ],
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
  subject!: {
    reference: string;
    display?: string;
  };

  @ApiPropertyOptional({
    description: 'List of participants involved in the encounter',
    type: [EncounterParticipantDto],
    example: [
      {
        type: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: 'ATND',
                display: 'attending',
              },
            ],
          },
        ],
        individual: {
          reference: 'Practitioner/456',
          display: 'Dr. Jane Smith',
        },
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EncounterParticipantDto)
  participant?: EncounterParticipantDto[];

  @ApiProperty({
    description: 'The start and end time of the encounter',
    example: {
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T10:30:00Z',
    },
  })
  @IsObject()
  period!: {
    start: string;
    end?: string;
  };

  @ApiPropertyOptional({
    description: 'Coded reason why the encounter takes place',
    example: [
      {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '185349003',
            display: 'Consultation',
          },
        ],
        text: 'Routine Consultation',
      },
    ],
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
    description: 'Indicates the urgency of the encounter',
    example: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActPriority',
          code: 'R',
          display: 'routine',
        },
      ],
      text: 'Routine',
    },
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
