import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Response DTO for email verification status
 */
export class VerifyEmailResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Email verified successfully',
  })
  message!: string;

  @ApiProperty({
    description: 'Email address that was verified',
    example: 'user@example.com',
  })
  email!: string;
}

/**
 * DTO for resending verification email
 */
export class ResendVerificationEmailDto {
  @ApiProperty({
    description: 'Email address to resend verification to',
    example: 'user@example.com',
  })
  @IsString()
  @IsNotEmpty()
  email!: string;
}

/**
 * Response DTO for resending verification email
 */
export class ResendVerificationEmailResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Verification email sent successfully',
  })
  message!: string;
}
