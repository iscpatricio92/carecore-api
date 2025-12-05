import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Practitioner } from '../interfaces/fhir.interface';

// Reuse common DTOs from patient
import { PatientIdentifierDto } from './fhir-patient.dto';
import { PatientNameDto } from './fhir-patient.dto';
import { PatientContactPointDto } from './fhir-patient.dto';
import { PatientAddressDto } from './fhir-patient.dto';

export class PractitionerQualificationDto {
  @ApiPropertyOptional({
    description: 'Identifiers for this qualification (license number, certificate ID, etc.)',
    type: [PatientIdentifierDto],
    example: [
      {
        use: 'official',
        system: 'http://example.com/medical-licenses',
        value: 'MD-12345',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientIdentifierDto)
  identifier?: PatientIdentifierDto[];

  @ApiProperty({
    description: 'Coded representation of the qualification',
    example: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0360',
          code: 'MD',
          display: 'Doctor of Medicine',
        },
      ],
      text: 'Medical Doctor',
    },
  })
  @ValidateNested()
  @Type(() => Object)
  code: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  @ApiPropertyOptional({
    description: 'Period during which the qualification is valid',
    example: {
      start: '2020-01-01',
      end: '2025-12-31',
    },
  })
  @IsOptional()
  period?: {
    start?: string;
    end?: string;
  };

  @ApiPropertyOptional({
    description: 'Organization that issued the qualification',
    example: {
      reference: 'Organization/456',
      display: 'State Medical Board',
    },
  })
  @IsOptional()
  issuer?: {
    reference?: string;
    display?: string;
  };
}

/**
 * DTO for creating a FHIR Practitioner
 * MVP: Essential fields only (name, identifier, contact)
 *
 * @example
 * {
 *   "identifier": [{
 *     "use": "official",
 *     "system": "http://example.com/medical-licenses",
 *     "value": "MD-12345"
 *   }],
 *   "name": [{
 *     "use": "official",
 *     "prefix": ["Dr."],
 *     "family": "Smith",
 *     "given": ["Jane"]
 *   }],
 *   "active": true,
 *   "telecom": [{
 *     "system": "email",
 *     "value": "jane.smith@example.com",
 *     "use": "work"
 *   }],
 *   "qualification": [{
 *     "code": {
 *       "coding": [{
 *         "system": "http://terminology.hl7.org/CodeSystem/v2-0360",
 *         "code": "MD",
 *         "display": "Doctor of Medicine"
 *       }]
 *     },
 *     "period": {
 *       "start": "2020-01-01",
 *       "end": "2025-12-31"
 *     }
 *   }]
 * }
 */
export class CreatePractitionerDto implements Partial<Practitioner> {
  @ApiProperty({
    description: 'Practitioner identifiers (license number, professional ID, etc.)',
    type: [PatientIdentifierDto],
    example: [
      {
        use: 'official',
        system: 'http://example.com/medical-licenses',
        value: 'MD-12345',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientIdentifierDto)
  identifier: PatientIdentifierDto[];

  @ApiPropertyOptional({
    description: 'Whether this practitioner record is in active use',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'Practitioner names (at least one name is required)',
    type: [PatientNameDto],
    example: [
      {
        use: 'official',
        prefix: ['Dr.'],
        family: 'Smith',
        given: ['Jane'],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientNameDto)
  name: PatientNameDto[];

  @ApiPropertyOptional({
    description: 'Contact information (email, phone, etc.)',
    type: [PatientContactPointDto],
    example: [
      {
        system: 'email',
        value: 'jane.smith@example.com',
        use: 'work',
      },
      {
        system: 'phone',
        value: '+1-555-987-6543',
        use: 'work',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientContactPointDto)
  telecom?: PatientContactPointDto[];

  @ApiPropertyOptional({
    description: 'Practitioner addresses (office, home, etc.)',
    type: [PatientAddressDto],
    example: [
      {
        use: 'work',
        line: ['456 Medical Center Drive'],
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'US',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientAddressDto)
  address?: PatientAddressDto[];

  @ApiPropertyOptional({
    description: 'Administrative gender of the practitioner',
    enum: ['male', 'female', 'other', 'unknown'],
    example: 'female',
  })
  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'unknown'])
  gender?: 'male' | 'female' | 'other' | 'unknown';

  @ApiPropertyOptional({
    description: 'Date of birth (YYYY-MM-DD format)',
    example: '1985-05-20',
  })
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'Professional qualifications (licenses, certifications, etc.)',
    type: [PractitionerQualificationDto],
    example: [
      {
        code: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0360',
              code: 'MD',
              display: 'Doctor of Medicine',
            },
          ],
        },
        period: {
          start: '2020-01-01',
          end: '2025-12-31',
        },
        issuer: {
          reference: 'Organization/456',
          display: 'State Medical Board',
        },
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PractitionerQualificationDto)
  qualification?: PractitionerQualificationDto[];
}

/**
 * DTO for updating a FHIR Practitioner
 */
export class UpdatePractitionerDto extends CreatePractitionerDto {
  @ApiPropertyOptional({ description: 'FHIR resource ID' })
  @IsOptional()
  @IsString()
  id?: string;
}
