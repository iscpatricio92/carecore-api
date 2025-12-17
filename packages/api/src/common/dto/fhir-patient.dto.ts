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
import { Patient } from '@carecore/shared';

// Declare auxiliary classes first
export class PatientIdentifierDto {
  @ApiPropertyOptional({
    description: 'How the identifier should be used',
    enum: ['usual', 'official', 'temp', 'secondary'],
    example: 'official',
  })
  @IsOptional()
  @IsEnum(['usual', 'official', 'temp', 'secondary'])
  use?: 'usual' | 'official' | 'temp' | 'secondary';

  @ApiPropertyOptional({
    description: 'The namespace for the identifier value (URI)',
    example: 'http://hl7.org/fhir/sid/us-ssn',
  })
  @IsOptional()
  @IsString()
  system?: string;

  @ApiProperty({
    description: 'The value that is unique within the system',
    example: '123-45-6789',
  })
  @IsString()
  value!: string;
}

export class PatientNameDto {
  @ApiPropertyOptional({
    description: 'How the name should be used',
    enum: ['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden'],
    example: 'official',
  })
  @IsOptional()
  @IsEnum(['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden'])
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';

  @ApiPropertyOptional({
    description: 'Full name as a single text string',
    example: 'John Michael Doe',
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    description: 'Family name (surname)',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  family?: string;

  @ApiProperty({
    description: 'Given names (first and middle names)',
    type: [String],
    example: ['John', 'Michael'],
  })
  @IsArray()
  @IsString({ each: true })
  given!: string[];

  @ApiPropertyOptional({
    description: 'Name prefixes (e.g., Dr., Mr., Mrs., Ms.)',
    type: [String],
    example: ['Mr.'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prefix?: string[];

  @ApiPropertyOptional({
    description: 'Name suffixes (e.g., Jr., Sr., II, III)',
    type: [String],
    example: ['Jr.'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suffix?: string[];
}

export class PatientContactPointDto {
  @ApiPropertyOptional({
    description: 'Telecommunications form for contact point',
    enum: ['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'],
    example: 'phone',
  })
  @IsOptional()
  @IsEnum(['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'])
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';

  @ApiProperty({
    description: 'The actual contact point details (phone number, email address, etc.)',
    example: '+1-555-123-4567',
  })
  @IsString()
  value!: string;

  @ApiPropertyOptional({
    description: 'Identifies the purpose for the contact point',
    enum: ['home', 'work', 'temp', 'old', 'mobile'],
    example: 'mobile',
  })
  @IsOptional()
  @IsEnum(['home', 'work', 'temp', 'old', 'mobile'])
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
}

export class PatientAddressDto {
  @ApiPropertyOptional({
    description: 'The purpose of this address',
    enum: ['home', 'work', 'temp', 'old', 'billing'],
    example: 'home',
  })
  @IsOptional()
  @IsEnum(['home', 'work', 'temp', 'old', 'billing'])
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';

  @ApiPropertyOptional({
    description: 'Distinguishes between physical and postal addresses',
    enum: ['postal', 'physical', 'both'],
    example: 'both',
  })
  @IsOptional()
  @IsEnum(['postal', 'physical', 'both'])
  type?: 'postal' | 'physical' | 'both';

  @ApiPropertyOptional({
    description: 'Full address as a single text string',
    example: '123 Main Street, Anytown, ST 12345, USA',
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    description: 'Street address lines (street name, number, apartment, etc.)',
    type: [String],
    example: ['123 Main Street', 'Apt 4B'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  line?: string[];

  @ApiPropertyOptional({
    description: 'Name of city, town, etc.',
    example: 'Anytown',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Sub-unit of country (state, province, etc.)',
    example: 'CA',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Postal code for area',
    example: '12345',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Country (ISO 3166 2-letter code)',
    example: 'US',
  })
  @IsOptional()
  @IsString()
  country?: string;
}

/**
 * DTO for creating a FHIR Patient
 *
 * @example
 * {
 *   "name": [{
 *     "use": "official",
 *     "family": "Doe",
 *     "given": ["John", "Michael"]
 *   }],
 *   "identifier": [{
 *     "use": "official",
 *     "system": "http://hl7.org/fhir/sid/us-ssn",
 *     "value": "123-45-6789"
 *   }],
 *   "gender": "male",
 *   "birthDate": "1990-01-15",
 *   "telecom": [{
 *     "system": "phone",
 *     "value": "+1-555-123-4567",
 *     "use": "mobile"
 *   }],
 *   "address": [{
 *     "use": "home",
 *     "line": ["123 Main Street"],
 *     "city": "Anytown",
 *     "state": "CA",
 *     "postalCode": "12345",
 *     "country": "US"
 *   }]
 * }
 */
export class CreatePatientDto implements Partial<Patient> {
  @ApiPropertyOptional({
    description: 'Patient identifiers (SSN, medical record number, etc.)',
    type: [PatientIdentifierDto],
    example: [
      {
        use: 'official',
        system: 'http://hl7.org/fhir/sid/us-ssn',
        value: '123-45-6789',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientIdentifierDto)
  identifier?: PatientIdentifierDto[];

  @ApiPropertyOptional({
    description: 'Whether this patient record is in active use',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'Patient names (at least one name is required)',
    type: [PatientNameDto],
    example: [
      {
        use: 'official',
        family: 'Doe',
        given: ['John', 'Michael'],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientNameDto)
  name!: PatientNameDto[];

  @ApiPropertyOptional({
    description: 'Contact information (phone, email, etc.)',
    type: [PatientContactPointDto],
    example: [
      {
        system: 'phone',
        value: '+1-555-123-4567',
        use: 'mobile',
      },
      {
        system: 'email',
        value: 'john.doe@example.com',
        use: 'home',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientContactPointDto)
  telecom?: PatientContactPointDto[];

  @ApiPropertyOptional({
    description: 'Administrative gender of the patient',
    enum: ['male', 'female', 'other', 'unknown'],
    example: 'male',
  })
  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'unknown'])
  gender?: 'male' | 'female' | 'other' | 'unknown';

  @ApiPropertyOptional({
    description: 'Date of birth (YYYY-MM-DD format)',
    example: '1990-01-15',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'Patient addresses (home, work, etc.)',
    type: [PatientAddressDto],
    example: [
      {
        use: 'home',
        type: 'both',
        line: ['123 Main Street', 'Apt 4B'],
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
