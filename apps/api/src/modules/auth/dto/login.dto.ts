import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { CLIENT_APPS, type ClientApp, type SessionPlatform } from '@troofn/shared';
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

  @ApiProperty({
    enum: CLIENT_APPS,
    description: 'Which app is signing in. Only owner and admin may use DASHBOARD.',
  })
  @IsIn(CLIENT_APPS)
  app: ClientApp;

  /** Optional, recorded on the session. Accepted but left out of the API docs. */
  @ApiHideProperty()
  @IsOptional()
  @IsIn(PLATFORMS)
  platform?: SessionPlatform;

  /** Optional, shown in the session list. Accepted but left out of the API docs. */
  @ApiHideProperty()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}
