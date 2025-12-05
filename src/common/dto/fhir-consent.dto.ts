import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  IsBoolean,
  IsDateString,
  IsObject,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Consent } from '../interfaces/fhir.interface';

export class ConsentPolicyDto {
  @ApiPropertyOptional({
    description: 'Policy authority',
    example: 'https://example.com/policy-authority',
  })
  @IsOptional()
  @IsString()
  authority?: string;

  @ApiPropertyOptional({
    description: 'Policy URI',
    example: 'https://example.com/policies/consent-policy-v1',
  })
  @IsOptional()
  @IsString()
  uri?: string;
}

export class ConsentVerificationDto {
  @ApiProperty({
    description: 'Whether consent was verified',
    example: true,
  })
  @IsBoolean()
  verified: boolean;

  @ApiPropertyOptional({
    description: 'Verification type',
    example: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: 'VRFY',
          display: 'verify',
        },
      ],
      text: 'Verification',
    },
  })
  @IsOptional()
  @IsObject()
  verificationType?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  @ApiPropertyOptional({
    description: 'Who verified the consent',
    example: {
      reference: 'Practitioner/123',
      display: 'Dr. Jane Smith',
    },
  })
  @IsOptional()
  @IsObject()
  verifiedBy?: {
    reference?: string;
    display?: string;
  };

  @ApiPropertyOptional({
    description: 'What was used to verify (e.g., signature, document)',
    example: {
      reference: 'DocumentReference/456',
      display: 'Signed Consent Form',
    },
  })
  @IsOptional()
  @IsObject()
  verifiedWith?: {
    reference?: string;
    display?: string;
  };

  @ApiPropertyOptional({
    description: 'Date and time when consent was verified (ISO 8601)',
    example: '2024-01-15T10:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  verificationDate?: string;
}

export class ConsentProvisionDataDto {
  @ApiProperty({
    description: 'Meaning of the data',
    enum: ['instance', 'related', 'dependents', 'authoredby'],
    example: 'instance',
  })
  @IsEnum(['instance', 'related', 'dependents', 'authoredby'])
  meaning: 'instance' | 'related' | 'dependents' | 'authoredby';

  @ApiProperty({
    description: 'Reference to the data resource',
    example: {
      reference: 'Patient/123',
      display: 'John Doe',
    },
  })
  @IsObject()
  reference: {
    reference: string;
    display?: string;
  };
}

export class ConsentProvisionActorDto {
  @ApiPropertyOptional({
    description: 'Role of the actor in the consent provision',
    example: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
          code: 'AUT',
          display: 'author',
        },
      ],
      text: 'Author',
    },
  })
  @IsOptional()
  @IsObject()
  role?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  @ApiProperty({
    description: 'Reference to the actor (Practitioner, Patient, Organization)',
    example: {
      reference: 'Practitioner/123',
      display: 'Dr. Jane Smith',
    },
  })
  @IsObject()
  reference: {
    reference: string;
    display?: string;
  };
}

export class ConsentProvisionDto {
  @ApiPropertyOptional({
    description: 'Type of provision',
    enum: ['deny', 'permit'],
  })
  @IsOptional()
  @IsEnum(['deny', 'permit'])
  type?: 'deny' | 'permit';

  @ApiPropertyOptional({ description: 'Time period for provision' })
  @IsOptional()
  @IsObject()
  period?: {
    start?: string;
    end?: string;
  };

  @ApiPropertyOptional({ description: 'Actors in provision', type: [ConsentProvisionActorDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentProvisionActorDto)
  actor?: ConsentProvisionActorDto[];

  @ApiPropertyOptional({ description: 'Actions permitted/denied' })
  @IsOptional()
  @IsArray()
  action?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;

  @ApiPropertyOptional({ description: 'Security labels' })
  @IsOptional()
  @IsArray()
  securityLabel?: Array<{
    system?: string;
    code?: string;
    display?: string;
  }>;

  @ApiPropertyOptional({ description: 'Purpose of use' })
  @IsOptional()
  @IsArray()
  purpose?: Array<{
    system?: string;
    code?: string;
    display?: string;
  }>;

  @ApiPropertyOptional({ description: 'Data classes' })
  @IsOptional()
  @IsArray()
  class?: Array<{
    system?: string;
    code?: string;
    display?: string;
  }>;

  @ApiPropertyOptional({ description: 'Data codes' })
  @IsOptional()
  @IsArray()
  code?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;

  @ApiPropertyOptional({ description: 'Data period' })
  @IsOptional()
  @IsObject()
  dataPeriod?: {
    start?: string;
    end?: string;
  };

  @ApiPropertyOptional({ description: 'Data references', type: [ConsentProvisionDataDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentProvisionDataDto)
  data?: ConsentProvisionDataDto[];

  @ApiPropertyOptional({ description: 'Nested provisions', type: [ConsentProvisionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentProvisionDto)
  provision?: ConsentProvisionDto[];
}

/**
 * DTO for creating a FHIR Consent
 * MVP: Essential fields only (status, scope, category, patient, dateTime)
 *
 * @example
 * {
 *   "status": "active",
 *   "scope": {
 *     "coding": [{
 *       "system": "http://terminology.hl7.org/CodeSystem/consentscope",
 *       "code": "patient-privacy",
 *       "display": "Privacy Consent"
 *     }]
 *   },
 *   "category": [{
 *     "coding": [{
 *       "system": "http://terminology.hl7.org/CodeSystem/consentcategorycodes",
 *       "code": "59284-0",
 *       "display": "Patient Consent"
 *     }]
 *   }],
 *   "patient": {
 *     "reference": "Patient/123",
 *     "display": "John Doe"
 *   },
 *   "dateTime": "2024-01-15T10:30:00Z"
 * }
 */
export class CreateConsentDto implements Partial<Consent> {
  @ApiPropertyOptional({
    description: 'Consent identifiers',
    example: [
      {
        use: 'official',
        system: 'http://example.com/consent-ids',
        value: 'CONSENT-2024-001',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  identifier?: Array<{
    use?: 'usual' | 'official' | 'temp' | 'secondary';
    system?: string;
    value: string;
  }>;

  @ApiProperty({
    description: 'Consent status',
    enum: ['draft', 'proposed', 'active', 'rejected', 'inactive', 'entered-in-error'],
    example: 'active',
  })
  @IsEnum(['draft', 'proposed', 'active', 'rejected', 'inactive', 'entered-in-error'])
  status: 'draft' | 'proposed' | 'active' | 'rejected' | 'inactive' | 'entered-in-error';

  @ApiProperty({
    description: 'Scope of consent',
    example: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/consentscope',
          code: 'patient-privacy',
          display: 'Privacy Consent',
        },
      ],
    },
  })
  @IsObject()
  scope: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  @ApiProperty({
    description: 'Consent categories',
    type: [Object],
    example: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
            code: '59284-0',
            display: 'Patient Consent',
          },
        ],
      },
    ],
  })
  @IsArray()
  category: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;

  @ApiProperty({
    description: 'Reference to the patient',
    example: {
      reference: 'Patient/123',
      display: 'John Doe',
    },
  })
  @IsObject()
  patient: {
    reference: string;
    display?: string;
  };

  @ApiPropertyOptional({ description: 'Date/time of consent' })
  @IsOptional()
  @IsDateString()
  dateTime?: string;

  @ApiPropertyOptional({ description: 'Who performed the consent' })
  @IsOptional()
  @IsArray()
  performer?: Array<{
    reference: string;
    display?: string;
  }>;

  @ApiPropertyOptional({ description: 'Organization managing consent' })
  @IsOptional()
  @IsArray()
  organization?: Array<{
    reference: string;
    display?: string;
  }>;

  @ApiPropertyOptional({ description: 'Source of consent (attachment)' })
  @IsOptional()
  @IsObject()
  sourceAttachment?: {
    contentType?: string;
    url?: string;
    title?: string;
  };

  @ApiPropertyOptional({ description: 'Source of consent (reference)' })
  @IsOptional()
  @IsObject()
  sourceReference?: {
    reference: string;
    display?: string;
  };

  @ApiPropertyOptional({ description: 'Policies related to consent', type: [ConsentPolicyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentPolicyDto)
  policy?: ConsentPolicyDto[];

  @ApiPropertyOptional({ description: 'Policy rule' })
  @IsOptional()
  @IsObject()
  policyRule?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  @ApiPropertyOptional({ description: 'Verification details', type: [ConsentVerificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentVerificationDto)
  verification?: ConsentVerificationDto[];

  @ApiPropertyOptional({ description: 'Consent provisions', type: ConsentProvisionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConsentProvisionDto)
  provision?: ConsentProvisionDto;
}

/**
 * DTO for updating a FHIR Consent
 * All fields are optional for partial updates
 */
export class UpdateConsentDto implements Partial<Consent> {
  @ApiPropertyOptional({ description: 'Consent identifiers' })
  @IsOptional()
  @IsArray()
  identifier?: Array<{
    use?: 'usual' | 'official' | 'temp' | 'secondary';
    system?: string;
    value: string;
  }>;

  @ApiPropertyOptional({
    description: 'Consent status',
    enum: ['draft', 'proposed', 'active', 'rejected', 'inactive', 'entered-in-error'],
  })
  @IsOptional()
  @IsEnum(['draft', 'proposed', 'active', 'rejected', 'inactive', 'entered-in-error'])
  status?: 'draft' | 'proposed' | 'active' | 'rejected' | 'inactive' | 'entered-in-error';

  @ApiPropertyOptional({ description: 'Scope of consent' })
  @IsOptional()
  @IsObject()
  scope?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  @ApiPropertyOptional({ description: 'Consent categories' })
  @IsOptional()
  @IsArray()
  category?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;

  @ApiPropertyOptional({ description: 'Reference to the patient' })
  @IsOptional()
  @IsObject()
  patient?: {
    reference: string;
    display?: string;
  };

  @ApiPropertyOptional({ description: 'Date/time of consent' })
  @IsOptional()
  @IsDateString()
  dateTime?: string;

  @ApiPropertyOptional({ description: 'Who performed the consent' })
  @IsOptional()
  @IsArray()
  performer?: Array<{
    reference: string;
    display?: string;
  }>;

  @ApiPropertyOptional({ description: 'Organization managing consent' })
  @IsOptional()
  @IsArray()
  organization?: Array<{
    reference: string;
    display?: string;
  }>;

  @ApiPropertyOptional({ description: 'Source of consent (attachment)' })
  @IsOptional()
  @IsObject()
  sourceAttachment?: {
    contentType?: string;
    url?: string;
    title?: string;
  };

  @ApiPropertyOptional({ description: 'Source of consent (reference)' })
  @IsOptional()
  @IsObject()
  sourceReference?: {
    reference: string;
    display?: string;
  };

  @ApiPropertyOptional({ description: 'Policies related to consent', type: [ConsentPolicyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentPolicyDto)
  policy?: ConsentPolicyDto[];

  @ApiPropertyOptional({ description: 'Policy rule' })
  @IsOptional()
  @IsObject()
  policyRule?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  @ApiPropertyOptional({ description: 'Verification details', type: [ConsentVerificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentVerificationDto)
  verification?: ConsentVerificationDto[];

  @ApiPropertyOptional({ description: 'Consent provisions', type: ConsentProvisionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConsentProvisionDto)
  provision?: ConsentProvisionDto;
}

/**
 * DTO for sharing consent with a practitioner for a specific number of days
 *
 * @example
 * {
 *   "practitionerReference": "Practitioner/123",
 *   "days": 30,
 *   "practitionerDisplay": "Dr. Jane Smith"
 * }
 */
export class ShareConsentWithPractitionerDto {
  @ApiProperty({
    description: 'Reference to the practitioner (format: Practitioner/{id})',
    example: 'Practitioner/123',
  })
  @IsString()
  practitionerReference: string;

  @ApiPropertyOptional({
    description: 'Display name of the practitioner',
    example: 'Dr. Jane Smith',
  })
  @IsOptional()
  @IsString()
  practitionerDisplay?: string;

  @ApiProperty({
    description: 'Number of days the consent will be valid (1-365)',
    example: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsNumber()
  @Min(1)
  @Max(365)
  days: number;
}
