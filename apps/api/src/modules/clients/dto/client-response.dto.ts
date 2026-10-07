import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SectorDto {
  @ApiProperty({ example: 'عقارات' }) nameAr: string;
  @ApiProperty({ example: 'Real estate' }) nameEn: string;
}

class TeamMemberDto {
  @ApiProperty({ format: 'uuid' }) userId: string;
  @ApiProperty({ example: 'فهد القحطاني' }) displayName: string;
  @ApiProperty({ enum: ['MARKETING_MANAGER', 'PROJECT_MANAGER', 'EXECUTION'] })
  teamRole: 'MARKETING_MANAGER' | 'PROJECT_MANAGER' | 'EXECUTION';
}

/** A row of the client sidebar. */
export class ClientSummaryDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'TID00S1W' }) code: string;
  @ApiProperty({ example: 'شركة وجناد العقارية' }) companyName: string;
  @ApiProperty({ example: 'معاذ ذياب الصوغ' }) contactName: string;
  @ApiPropertyOptional({ type: SectorDto, nullable: true }) sector: SectorDto | null;
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] }) status: 'ACTIVE' | 'INACTIVE';
  @ApiProperty() appAccessEnabled: boolean;
}

/** The client profile ("بيانات العميل") with its Troofn team. */
export class ClientDetailDto extends ClientSummaryDto {
  @ApiPropertyOptional({ type: String, nullable: true }) email: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) phone: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) website: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) legalRepresentative: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) driveUrl: string | null;
  @ApiPropertyOptional({ type: Date, nullable: true }) contractStartDate: Date | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) renewalPeriodMonths: number | null;
  @ApiProperty({ type: [TeamMemberDto] }) team: TeamMemberDto[];
}
