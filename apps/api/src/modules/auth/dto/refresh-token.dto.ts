import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refreshToken from login or the previous refresh' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  refreshToken: string;
}
