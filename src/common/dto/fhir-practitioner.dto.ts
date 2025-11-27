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
  @ApiPropertyOptional({ description: 'Qualification identifiers' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientIdentifierDto)
  identifier?: PatientIdentifierDto[];

  @ApiProperty({
    description: 'Qualification code',
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

  @ApiPropertyOptional({ description: 'Period of qualification validity' })
  @IsOptional()
  period?: {
    start?: string;
    end?: string;
  };

  @ApiPropertyOptional({ description: 'Organization that issued the qualification' })
  @IsOptional()
  issuer?: {
    reference?: string;
    display?: string;
  };
}

/**
 * DTO for creating a FHIR Practitioner
 * MVP: Essential fields only (name, identifier, contact)
 */
export class CreatePractitionerDto implements Partial<Practitioner> {
  @ApiProperty({
    description: 'Practitioner identifiers (license, professional ID)',
    type: [PatientIdentifierDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientIdentifierDto)
  identifier: PatientIdentifierDto[];

  @ApiPropertyOptional({ description: 'Whether the practitioner is active', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'Practitioner names',
    type: [PatientNameDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientNameDto)
  name: PatientNameDto[];

  @ApiPropertyOptional({ description: 'Contact information (email, phone)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientContactPointDto)
  telecom?: PatientContactPointDto[];

  @ApiPropertyOptional({ description: 'Practitioner addresses' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientAddressDto)
  address?: PatientAddressDto[];

  @ApiPropertyOptional({
    description: 'Practitioner gender',
    enum: ['male', 'female', 'other', 'unknown'],
  })
  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'unknown'])
  gender?: 'male' | 'female' | 'other' | 'unknown';

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'Professional qualifications',
    type: [PractitionerQualificationDto],
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
