import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SessionPlatform } from '@troofn/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const PLATFORMS: SessionPlatform[] = ['WEB', 'IOS', 'ANDROID', 'UNKNOWN'];

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Case-insensitive' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;

  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password: string;

  @ApiPropertyOptional({ enum: PLATFORMS, default: 'UNKNOWN' })
  @IsOptional()
  @IsIn(PLATFORMS)
  platform?: SessionPlatform;

  @ApiPropertyOptional({ example: 'iPhone 15 Pro', description: 'Shown in the session list' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}
