import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@troofn/shared';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PASSWORD_POLICY, PASSWORD_POLICY_MESSAGE } from '../../auth/password.js';

const lowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const USERNAME_PATTERN = /^[a-z0-9._#-]{3,50}$/;

export class CreateUserDto {
  @ApiProperty({
    example: 'wejnad#2',
    description: '3–50 chars: letters, digits, . _ # -; stored lowercase',
  })
  @Transform(lowerTrim)
  @IsString()
  @Matches(USERNAME_PATTERN, {
    message: 'username must be 3–50 characters: letters, digits, . _ # -',
  })
  username: string;

  @ApiProperty({ example: 'مسؤول تسويق وجناد' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  displayName: string;

  @ApiProperty({ enum: Role, example: Role.CLIENT_MARKETING_OFFICER })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required for client roles, forbidden for staff roles',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({ format: 'password', description: PASSWORD_POLICY_MESSAGE })
  @IsString()
  @MaxLength(200)
  @Matches(PASSWORD_POLICY, { message: PASSWORD_POLICY_MESSAGE })
  password: string;

  @ApiPropertyOptional({ example: 'marketing@wejnad.sa' })
  @IsOptional()
  @Transform(lowerTrim)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+966551234567' })
  @IsOptional()
  @Transform(trim)
  @Matches(/^\+?[0-9 ]{7,20}$/, { message: 'phone must be digits, optionally starting with +' })
  phone?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @ApiPropertyOptional({ default: false, description: 'Force a password change at first login' })
  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;
}
