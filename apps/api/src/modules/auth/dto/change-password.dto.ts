import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { PASSWORD_POLICY, PASSWORD_POLICY_MESSAGE } from '../password.js';

export class ChangePasswordDto {
  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  currentPassword: string;

  @ApiProperty({ format: 'password', description: PASSWORD_POLICY_MESSAGE })
  @IsString()
  @MaxLength(200)
  @Matches(PASSWORD_POLICY, { message: PASSWORD_POLICY_MESSAGE })
  newPassword: string;
}
