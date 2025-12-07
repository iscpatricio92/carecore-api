import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

/**
 * DTO for MFA Setup Response
 */
export class SetupMFAResponseDto {
  @ApiProperty({
    description: 'TOTP secret key for manual entry',
    example: 'JBSWY3DPEHPK3PXP',
  })
  secret: string;

  @ApiProperty({
    description: 'QR code as base64 data URL for scanning with authenticator app',
    example: 'data:image/png;base64,iVBORw0KG...',
  })
  qrCode: string;

  @ApiProperty({
    description: 'Manual entry key (same as secret)',
    example: 'JBSWY3DPEHPK3PXP',
  })
  manualEntryKey: string;

  @ApiProperty({
    description: 'Informative message for the user',
    example: 'Scan the QR code with your authenticator app',
  })
  message: string;
}

/**
 * DTO for MFA Verification Request
 */
export class VerifyMFADto {
  @ApiProperty({
    description: 'TOTP code from authenticator app (6 digits)',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6, { message: 'TOTP code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'TOTP code must contain only digits' })
  code: string;
}

/**
 * DTO for MFA Verification Response
 */
export class VerifyMFAResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'MFA enabled successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Whether MFA is now enabled for the user',
    example: true,
  })
  mfaEnabled: boolean;
}

/**
 * DTO for MFA Disable Request
 */
export class DisableMFADto {
  @ApiProperty({
    description: 'Current TOTP code from authenticator app (6 digits) for verification',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6, { message: 'TOTP code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'TOTP code must contain only digits' })
  code: string;
}

/**
 * DTO for MFA Disable Response
 */
export class DisableMFAResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'MFA disabled successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Whether MFA is now disabled for the user',
    example: false,
  })
  mfaEnabled: boolean;
}

/**
 * DTO for MFA Status Response
 */
export class MFAStatusResponseDto {
  @ApiProperty({
    description: 'Whether MFA is enabled for the user',
    example: true,
  })
  mfaEnabled: boolean;

  @ApiProperty({
    description: 'Whether MFA is required for the user based on their roles',
    example: true,
  })
  mfaRequired: boolean;

  @ApiProperty({
    description: 'Informative message',
    example: 'MFA is enabled and active',
  })
  message: string;
}
