import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';
import { PASSWORD_POLICY, PASSWORD_POLICY_MESSAGE } from '../../auth/password.js';

export class ResetPasswordDto {
  @ApiProperty({
    format: 'password',
    description: `Temporary password. ${PASSWORD_POLICY_MESSAGE}`,
  })
  @IsString()
  @MaxLength(200)
  @Matches(PASSWORD_POLICY, { message: PASSWORD_POLICY_MESSAGE })
  newPassword: string;
}
