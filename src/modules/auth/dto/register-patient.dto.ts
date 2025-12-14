import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PatientIdentifierDto,
  PatientNameDto,
  PatientContactPointDto,
  PatientAddressDto,
} from '@/common/dto/fhir-patient.dto';

/**
 * DTO for patient registration
 * Combines authentication credentials with patient FHIR data
 */
export class RegisterPatientDto {
  @ApiProperty({
    description: 'Username for authentication (must be unique)',
    example: 'john.doe',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: 'Email address (must be unique)',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password (minimum 8 characters)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

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
  name: PatientNameDto[];

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
    description: 'Contact information (phone, email, etc.)',
    type: [PatientContactPointDto],
    example: [
      {
        system: 'phone',
        value: '+1-555-123-4567',
        use: 'mobile',
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

  @ApiPropertyOptional({
    description: 'Whether this patient record is in active use',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/**
 * Response DTO for patient registration
 */
export class RegisterPatientResponseDto {
  @ApiProperty({
    description: 'Keycloak user ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId: string;

  @ApiProperty({
    description: 'FHIR Patient resource ID',
    example: 'patient-123',
  })
  patientId: string;

  @ApiProperty({
    description: 'Username',
    example: 'john.doe',
  })
  username: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Success message',
    example: 'Patient registered successfully',
  })
  message: string;
}
