import { sampleSections } from './data/sample-sections';
import type {
  ApiTeamRole,
  ClientDetailResponse,
  ClientSummaryResponse,
} from './models/client-api.model';
import type { ClientOverview, ClientSummary } from './models/client.model';

/** What each team role is called on screen. */
const TEAM_ROLE_LABEL: Record<ApiTeamRole, string> = {
  MARKETING_MANAGER: 'مدير التسويق',
  PROJECT_MANAGER: 'مدير المشروع',
  EXECUTION: 'فريق التنفيذ',
};

export function toClientSummary(dto: ClientSummaryResponse): ClientSummary {
  return {
    id: dto.id,
    name: dto.companyName,
    sector: dto.sector?.nameAr ?? '',
    status: dto.status,
    // The API has no unread counter yet.
    unreadCount: 0,
  };
}

/**
 * The overview page from the API's client profile. Fields the API has are real; the rest come from
 * sampleSections() (see there for which).
 */
export function toClientOverview(dto: ClientDetailResponse): ClientOverview {
  const sample = sampleSections();
  return {
    ...toClientSummary(dto),
    activity: dto.sector?.nameAr ?? '',
    contactName: dto.contactName,
    stats: sample.stats,
    appAccess: { ...sample.appAccess, enabled: dto.appAccessEnabled },
    contract: { ...sample.contract, startDate: dto.contractStartDate?.slice(0, 10) ?? null },
    team: dto.team.map((member) => ({
      id: member.userId,
      name: member.displayName,
      role: TEAM_ROLE_LABEL[member.teamRole],
    })),
    contact: { phone: dto.phone, email: dto.email, website: dto.website },
    timeline: sample.timeline,
  };
}
