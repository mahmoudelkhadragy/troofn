import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UserRoleDto {
  @ApiProperty({ example: 'client_accountant' }) key: string;
  @ApiProperty({ example: 'مدير الحسابات' }) nameAr: string;
  @ApiProperty({ example: 'Client accountant' }) nameEn: string;
  @ApiProperty({ enum: ['STAFF', 'CLIENT'] }) audience: 'STAFF' | 'CLIENT';
}

class UserClientDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'TID00S1W' }) code: string;
  @ApiProperty({ example: 'شركة وجناد العقارية' }) companyName: string;
}

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() username: string;
  @ApiProperty() displayName: string;
  @ApiPropertyOptional({ type: String, nullable: true }) email: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) phone: string | null;
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] }) status: 'ACTIVE' | 'INACTIVE';
  @ApiProperty({ type: UserRoleDto }) role: UserRoleDto;
  @ApiPropertyOptional({ type: UserClientDto, nullable: true }) client: UserClientDto | null;
  @ApiProperty() mustChangePassword: boolean;
  @ApiPropertyOptional({ type: Date, nullable: true }) lastLoginAt: Date | null;
  @ApiPropertyOptional({ type: Date, nullable: true, description: 'Set while locked out' })
  lockedUntil: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
