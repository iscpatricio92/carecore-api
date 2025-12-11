import { IsString, IsNotEmpty, IsUrl, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for SMART on FHIR Launch endpoint parameters
 * Based on SMART App Launch specification
 *
 * @example
 * {
 *   "iss": "https://carecore.example.com",
 *   "launch": "xyz123",
 *   "client_id": "app-123",
 *   "redirect_uri": "https://app.com/callback",
 *   "scope": "patient:read patient:write",
 *   "state": "abc123"
 * }
 */
export class SmartFhirLaunchDto {
  @ApiProperty({
    description: 'Issuer - URL of the FHIR server',
    example: 'https://carecore.example.com',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  iss: string;

  @ApiProperty({
    description: 'Launch context token - opaque token provided by the EHR',
    example: 'xyz123',
  })
  @IsString()
  @IsNotEmpty()
  launch: string;

  @ApiProperty({
    description: 'Client ID of the SMART on FHIR application',
    example: 'app-123',
  })
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @ApiProperty({
    description: 'Redirect URI where the authorization code will be sent',
    example: 'https://app.com/callback',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  redirect_uri: string;

  @ApiProperty({
    description: 'Space-separated list of scopes (e.g., "patient:read patient:write")',
    example: 'patient:read patient:write',
  })
  @IsString()
  @IsNotEmpty()
  scope: string;

  @ApiPropertyOptional({
    description: 'CSRF protection token',
    example: 'abc123xyz',
  })
  @IsOptional()
  @IsString()
  state?: string;
}
