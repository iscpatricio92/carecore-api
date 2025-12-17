import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  IsDateString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentReference } from '@carecore/shared';

export class DocumentReferenceRelatesToDto {
  @ApiProperty({
    description: 'Relationship type between documents',
    enum: ['replaces', 'transforms', 'signs', 'appends'],
    example: 'replaces',
  })
  @IsEnum(['replaces', 'transforms', 'signs', 'appends'])
  code!: 'replaces' | 'transforms' | 'signs' | 'appends';

  @ApiProperty({
    description: 'Reference to the related document',
    example: {
      reference: 'DocumentReference/456',
      display: 'Previous Medical Report',
    },
  })
  @IsObject()
  target!: {
    reference: string;
    display?: string;
  };
}

export class DocumentReferenceContentDto {
  @ApiProperty({
    description: 'Document attachment with content or URL',
    example: {
      contentType: 'application/pdf',
      url: 'https://example.com/documents/medical-report-2024-001.pdf',
      title: 'Medical Report - Annual Checkup',
      size: 245760,
      hash: 'sha256:abc123...',
      creation: '2024-01-15T10:30:00Z',
    },
  })
  @IsObject()
  attachment!: {
    contentType?: string;
    language?: string;
    data?: string;
    url?: string;
    size?: number;
    hash?: string;
    title?: string;
    creation?: string;
  };

  @ApiPropertyOptional({
    description: 'Document format (MIME type or code)',
    example: {
      system: 'urn:ietf:bcp:13',
      code: 'application/pdf',
      display: 'PDF',
    },
  })
  @IsOptional()
  @IsObject()
  format?: {
    system?: string;
    code?: string;
    display?: string;
  };
}

export class DocumentReferenceContextDto {
  @ApiPropertyOptional({
    description: 'Related encounters where this document was created',
    example: [
      {
        reference: 'Encounter/789',
        display: 'Annual Checkup - 2024-01-15',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  encounter?: Array<{
    reference: string;
    display?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Clinical event context (e.g., procedure, diagnosis)',
    example: [
      {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '185349003',
            display: 'Consultation',
          },
        ],
        text: 'Consultation',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  event?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Time period when document is relevant',
    example: {
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
    },
  })
  @IsOptional()
  @IsObject()
  period?: {
    start?: string;
    end?: string;
  };

  @ApiPropertyOptional({
    description: 'Type of healthcare facility',
    example: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
          code: 'HOSP',
          display: 'Hospital',
        },
      ],
      text: 'Hospital',
    },
  })
  @IsOptional()
  @IsObject()
  facilityType?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  @ApiPropertyOptional({
    description: 'Practice setting where document was created',
    example: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: 'AMB',
          display: 'Ambulatory',
        },
      ],
      text: 'Ambulatory Care',
    },
  })
  @IsOptional()
  @IsObject()
  practiceSetting?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  @ApiPropertyOptional({
    description: 'Source patient information (if document is about another patient)',
    example: {
      reference: 'Patient/999',
      display: 'Source Patient',
    },
  })
  @IsOptional()
  @IsObject()
  sourcePatientInfo?: {
    reference: string;
    display?: string;
  };

  @ApiPropertyOptional({
    description: 'Related resources (e.g., other documents, observations)',
    example: [
      {
        reference: 'Observation/111',
        display: 'Blood Pressure Reading',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  related?: Array<{
    reference: string;
    display?: string;
  }>;
}

/**
 * DTO for creating a FHIR DocumentReference
 * MVP: Essential fields only (status, type, subject, date, author, content)
 *
 * @example
 * {
 *   "status": "current",
 *   "type": {
 *     "coding": [{
 *       "system": "http://loinc.org",
 *       "code": "34133-9",
 *       "display": "Summary of episode note"
 *     }]
 *   },
 *   "subject": {
 *     "reference": "Patient/123",
 *     "display": "John Doe"
 *   },
 *   "date": "2024-01-15T10:30:00Z",
 *   "author": [{
 *     "reference": "Practitioner/456",
 *     "display": "Dr. Jane Smith"
 *   }],
 *   "content": [{
 *     "attachment": {
 *       "contentType": "application/pdf",
 *       "url": "https://example.com/documents/report.pdf",
 *       "title": "Medical Report"
 *     }
 *   }]
 * }
 */
export class CreateDocumentReferenceDto implements Partial<DocumentReference> {
  @ApiPropertyOptional({
    description: 'Master identifier for the document',
    example: {
      use: 'official',
      system: 'http://example.com/document-ids',
      value: 'DOC-2024-001',
    },
  })
  @IsOptional()
  @IsObject()
  masterIdentifier?: {
    use?: 'usual' | 'official' | 'temp' | 'secondary';
    system?: string;
    value: string;
  };

  @ApiPropertyOptional({
    description: 'Additional document identifiers',
    example: [
      {
        use: 'secondary',
        system: 'http://example.com/external-ids',
        value: 'EXT-12345',
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
    description: 'Document status',
    enum: ['current', 'superseded', 'entered-in-error'],
    example: 'current',
  })
  @IsEnum(['current', 'superseded', 'entered-in-error'])
  status!: 'current' | 'superseded' | 'entered-in-error';

  @ApiPropertyOptional({
    description: 'Document status (clinical)',
    enum: ['preliminary', 'final', 'amended', 'entered-in-error', 'deprecated'],
  })
  @IsOptional()
  @IsEnum(['preliminary', 'final', 'amended', 'entered-in-error', 'deprecated'])
  docStatus?: 'preliminary' | 'final' | 'amended' | 'entered-in-error' | 'deprecated';

  @ApiProperty({
    description: 'Type of document',
    example: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '34133-9',
          display: 'Summary of episode note',
        },
      ],
    },
  })
  @IsObject()
  type!: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  @ApiPropertyOptional({ description: 'Document categories' })
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

  @ApiProperty({
    description: 'Subject of the document (Patient)',
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

  @ApiPropertyOptional({ description: 'Date of document creation' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Document authors' })
  @IsOptional()
  @IsArray()
  author?: Array<{
    reference: string;
    display?: string;
  }>;

  @ApiPropertyOptional({ description: 'Who authenticated the document' })
  @IsOptional()
  @IsObject()
  authenticator?: {
    reference: string;
    display?: string;
  };

  @ApiPropertyOptional({ description: 'Document custodian' })
  @IsOptional()
  @IsObject()
  custodian?: {
    reference: string;
    display?: string;
  };

  @ApiPropertyOptional({
    description: 'Relationships to other documents',
    type: [DocumentReferenceRelatesToDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentReferenceRelatesToDto)
  relatesTo?: DocumentReferenceRelatesToDto[];

  @ApiPropertyOptional({ description: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Security labels' })
  @IsOptional()
  @IsArray()
  securityLabel?: Array<{
    system?: string;
    code?: string;
    display?: string;
  }>;

  @ApiProperty({
    description: 'Document content',
    type: [DocumentReferenceContentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentReferenceContentDto)
  content!: DocumentReferenceContentDto[];

  @ApiPropertyOptional({ description: 'Document context', type: DocumentReferenceContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentReferenceContextDto)
  context?: DocumentReferenceContextDto;
}

/**
 * DTO for updating a FHIR DocumentReference
 * All fields are optional for partial updates
 */
export class UpdateDocumentReferenceDto implements Partial<DocumentReference> {
  @ApiPropertyOptional({ description: 'Master identifier' })
  @IsOptional()
  @IsObject()
  masterIdentifier?: {
    use?: 'usual' | 'official' | 'temp' | 'secondary';
    system?: string;
    value: string;
  };

  @ApiPropertyOptional({ description: 'Document identifiers' })
  @IsOptional()
  @IsArray()
  identifier?: Array<{
    use?: 'usual' | 'official' | 'temp' | 'secondary';
    system?: string;
    value: string;
  }>;

  @ApiPropertyOptional({
    description: 'Document status',
    enum: ['current', 'superseded', 'entered-in-error'],
  })
  @IsOptional()
  @IsEnum(['current', 'superseded', 'entered-in-error'])
  status?: 'current' | 'superseded' | 'entered-in-error';

  @ApiPropertyOptional({
    description: 'Document status (clinical)',
    enum: ['preliminary', 'final', 'amended', 'entered-in-error', 'deprecated'],
  })
  @IsOptional()
  @IsEnum(['preliminary', 'final', 'amended', 'entered-in-error', 'deprecated'])
  docStatus?: 'preliminary' | 'final' | 'amended' | 'entered-in-error' | 'deprecated';

  @ApiPropertyOptional({ description: 'Type of document' })
  @IsOptional()
  @IsObject()
  type?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  @ApiPropertyOptional({ description: 'Document categories' })
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

  @ApiPropertyOptional({ description: 'Subject of the document (Patient)' })
  @IsOptional()
  @IsObject()
  subject?: {
    reference: string;
    display?: string;
  };

  @ApiPropertyOptional({ description: 'Date of document creation' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Document authors' })
  @IsOptional()
  @IsArray()
  author?: Array<{
    reference: string;
    display?: string;
  }>;

  @ApiPropertyOptional({ description: 'Who authenticated the document' })
  @IsOptional()
  @IsObject()
  authenticator?: {
    reference: string;
    display?: string;
  };

  @ApiPropertyOptional({ description: 'Document custodian' })
  @IsOptional()
  @IsObject()
  custodian?: {
    reference: string;
    display?: string;
  };

  @ApiPropertyOptional({
    description: 'Relationships to other documents',
    type: [DocumentReferenceRelatesToDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentReferenceRelatesToDto)
  relatesTo?: DocumentReferenceRelatesToDto[];

  @ApiPropertyOptional({ description: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Security labels' })
  @IsOptional()
  @IsArray()
  securityLabel?: Array<{
    system?: string;
    code?: string;
    display?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Document content',
    type: [DocumentReferenceContentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentReferenceContentDto)
  content?: DocumentReferenceContentDto[];

  @ApiPropertyOptional({ description: 'Document context', type: DocumentReferenceContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentReferenceContextDto)
  context?: DocumentReferenceContextDto;
}
