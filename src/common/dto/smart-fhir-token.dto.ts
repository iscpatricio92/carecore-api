import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for SMART on FHIR Token endpoint parameters
 * Based on OAuth2 Token Exchange specification
 *
 * @example
 * {
 *   "grant_type": "authorization_code",
 *   "code": "abc123",
 *   "redirect_uri": "https://app.com/callback",
 *   "client_id": "app-123",
 *   "client_secret": "secret-123"
 * }
 */
export class SmartFhirTokenDto {
  @ApiProperty({
    description: 'Grant type - must be "authorization_code" or "refresh_token"',
    example: 'authorization_code',
    enum: ['authorization_code', 'refresh_token'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['authorization_code', 'refresh_token'], {
    message: 'grant_type must be "authorization_code" or "refresh_token"',
  })
  grant_type: 'authorization_code' | 'refresh_token';

  @ApiPropertyOptional({
    description: 'Authorization code (required for authorization_code grant)',
    example: 'abc123xyz',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description:
      'Redirect URI (required for authorization_code grant, must match the one used in /fhir/auth)',
    example: 'https://app.com/callback',
  })
  @IsOptional()
  @IsString()
  redirect_uri?: string;

  @ApiProperty({
    description: 'Client ID of the SMART on FHIR application',
    example: 'app-123',
  })
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @ApiPropertyOptional({
    description: 'Client secret (required for confidential clients)',
    example: 'secret-123',
  })
  @IsOptional()
  @IsString()
  client_secret?: string;

  @ApiPropertyOptional({
    description: 'Refresh token (required for refresh_token grant)',
    example: 'refresh-token-xyz',
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
