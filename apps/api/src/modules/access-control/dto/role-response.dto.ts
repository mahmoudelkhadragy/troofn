import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionScope } from '@troofn/shared';

export class RoleGrantDto {
  @ApiProperty({ example: 'clients.read' }) key: string;
  @ApiProperty({ example: 'clients' }) module: string;
  @ApiProperty({ enum: Object.values(PermissionScope) }) scope: PermissionScope;
}

export class RoleResponseDto {
  @ApiProperty({ example: 'client_accountant' }) key: string;
  @ApiProperty({ example: 'مدير الحسابات' }) nameAr: string;
  @ApiProperty({ example: 'Client accountant' }) nameEn: string;
  @ApiProperty({ enum: ['STAFF', 'CLIENT'] }) audience: 'STAFF' | 'CLIENT';
  @ApiPropertyOptional({ type: String, nullable: true }) description: string | null;
  @ApiProperty({ description: 'Active (not deleted) users with this role' }) userCount: number;
  @ApiProperty({ type: [RoleGrantDto] }) permissions: RoleGrantDto[];
}
