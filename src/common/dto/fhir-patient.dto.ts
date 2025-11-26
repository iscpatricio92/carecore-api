import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Patient } from '../interfaces/fhir.interface';

// Declare auxiliary classes first
export class PatientIdentifierDto {
  @ApiPropertyOptional({ description: 'Identifier use' })
  @IsOptional()
  @IsEnum(['usual', 'official', 'temp', 'secondary'])
  use?: 'usual' | 'official' | 'temp' | 'secondary';

  @ApiPropertyOptional({ description: 'Identifier system (URI)' })
  @IsOptional()
  @IsString()
  system?: string;

  @ApiProperty({ description: 'Identifier value' })
  @IsString()
  value: string;
}

export class PatientNameDto {
  @ApiPropertyOptional({ description: 'Name use' })
  @IsOptional()
  @IsEnum(['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden'])
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';

  @ApiPropertyOptional({ description: 'Full name as text' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: 'Family name (surname)' })
  @IsOptional()
  @IsString()
  family?: string;

  @ApiProperty({ description: 'Given names (first names)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  given: string[];

  @ApiPropertyOptional({ description: 'Name prefixes (e.g., Dr., Mr.)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prefix?: string[];

  @ApiPropertyOptional({ description: 'Name suffixes (e.g., Jr., Sr.)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suffix?: string[];
}

export class PatientContactPointDto {
  @ApiPropertyOptional({
    description: 'Contact system',
    enum: ['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'],
  })
  @IsOptional()
  @IsEnum(['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'])
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';

  @ApiProperty({ description: 'Contact value' })
  @IsString()
  value: string;

  @ApiPropertyOptional({
    description: 'Contact use',
    enum: ['home', 'work', 'temp', 'old', 'mobile'],
  })
  @IsOptional()
  @IsEnum(['home', 'work', 'temp', 'old', 'mobile'])
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
}

export class PatientAddressDto {
  @ApiPropertyOptional({
    description: 'Address use',
    enum: ['home', 'work', 'temp', 'old', 'billing'],
  })
  @IsOptional()
  @IsEnum(['home', 'work', 'temp', 'old', 'billing'])
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';

  @ApiPropertyOptional({ description: 'Address type', enum: ['postal', 'physical', 'both'] })
  @IsOptional()
  @IsEnum(['postal', 'physical', 'both'])
  type?: 'postal' | 'physical' | 'both';

  @ApiPropertyOptional({ description: 'Full address as text' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: 'Address lines', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  line?: string[];

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;
}

/**
 * DTO for creating a FHIR Patient
 */
export class CreatePatientDto implements Partial<Patient> {
  @ApiPropertyOptional({ description: 'Patient identifiers' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientIdentifierDto)
  identifier?: PatientIdentifierDto[];

  @ApiPropertyOptional({ description: 'Whether the patient is active', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ description: 'Patient names', type: [PatientNameDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientNameDto)
  name: PatientNameDto[];

  @ApiPropertyOptional({ description: 'Contact information' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientContactPointDto)
  telecom?: PatientContactPointDto[];

  @ApiPropertyOptional({
    description: 'Patient gender',
    enum: ['male', 'female', 'other', 'unknown'],
  })
  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'unknown'])
  gender?: 'male' | 'female' | 'other' | 'unknown';

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Patient addresses' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientAddressDto)
  address?: PatientAddressDto[];
}

/**
 * DTO for updating a FHIR Patient
 */
export class UpdatePatientDto extends CreatePatientDto {
  @ApiPropertyOptional({ description: 'FHIR resource ID' })
  @IsOptional()
  @IsString()
  id?: string;
}
