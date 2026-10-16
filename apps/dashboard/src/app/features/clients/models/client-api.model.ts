/**
 * The JSON the API returns for clients (GET /clients and GET /clients/:id, after the
 * `{ success, data }` envelope is removed). It mirrors ClientSummaryDto / ClientDetailDto in
 * apps/api/src/modules/clients/dto; change both together.
 */

export type ApiClientStatus = 'ACTIVE' | 'INACTIVE';
export type ApiTeamRole = 'MARKETING_MANAGER' | 'PROJECT_MANAGER' | 'EXECUTION';

export interface ClientSummaryResponse {
  id: string;
  code: string;
  companyName: string;
  contactName: string;
  sector: { nameAr: string; nameEn: string } | null;
  status: ApiClientStatus;
  appAccessEnabled: boolean;
}

export interface ClientDetailResponse extends ClientSummaryResponse {
  email: string | null;
  phone: string | null;
  website: string | null;
  legalRepresentative: string | null;
  driveUrl: string | null;
  /** ISO date-time at UTC midnight, e.g. "2025-06-01T00:00:00.000Z". */
  contractStartDate: string | null;
  renewalPeriodMonths: number | null;
  team: { userId: string; displayName: string; teamRole: ApiTeamRole }[];
}
