import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AuthUser, LoginResponse, PermissionScope, Role } from '@troofn/shared';

/** Swagger shapes for the auth responses (the types themselves live in @troofn/shared). */

class RoleNameDto {
  @ApiProperty({ example: 'مدير النظام' }) ar: string;
  @ApiProperty({ example: 'Troofn admin' }) en: string;
}

class AuthClientDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'TID00S1W' }) code: string;
  @ApiProperty({ example: 'شركة وجناد العقارية' }) companyName: string;
}

export class AuthUserDto implements AuthUser {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'admin' }) username: string;
  @ApiProperty({ example: 'Troofn Admin' }) displayName: string;
  @ApiPropertyOptional({ type: String, nullable: true }) email: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) phone: string | null;
  @ApiProperty({ example: 'admin' }) role: Role;
  @ApiProperty({ type: RoleNameDto }) roleName: RoleNameDto;
  @ApiPropertyOptional({ type: AuthClientDto, nullable: true }) client: AuthClientDto | null;
  @ApiProperty() mustChangePassword: boolean;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastLoginAt: string | null;
  @ApiProperty({
    example: { 'clients.read': 'ALL', 'users.read': 'ALL' },
    description: 'permission key → scope (ALL | ASSIGNED | OWN_CLIENT | OWN)',
  })
  permissions: Record<string, PermissionScope>;
}

export class LoginResponseDto implements LoginResponse {
  @ApiProperty({ enum: ['Bearer'] }) tokenType: 'Bearer';
  @ApiProperty() accessToken: string;
  @ApiProperty({ example: 900, description: 'Access token lifetime in seconds' })
  expiresIn: number;
  @ApiProperty({ description: '<sessionId>.<secret> — rotated on every refresh' })
  refreshToken: string;
  @ApiProperty({ format: 'date-time' }) refreshTokenExpiresAt: string;
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
}
