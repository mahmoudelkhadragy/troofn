import { type Observable, of } from 'rxjs';
import type { ClientsApi } from '../clients.api';
import { toClientOverview, toClientSummary } from '../clients.mapper';
import type { ClientDetailResponse, ClientSummaryResponse } from '../models/client-api.model';
import type { ClientOverview, ClientSummary } from '../models/client.model';

/** API-shaped sample clients for the specs; they mirror the three seeded demo companies. */

export const JABR_SUMMARY: ClientSummaryResponse = {
  id: '01a1213c-eded-731a-8c5d-38a5ee80ac47',
  code: 'TID00S2J',
  companyName: 'شركة الجبر للسيارات',
  contactName: 'خالد الجبر',
  sector: { nameAr: 'سيارات', nameEn: 'Automotive' },
  status: 'ACTIVE',
  appAccessEnabled: true,
};

export const NUKHBA_SUMMARY: ClientSummaryResponse = {
  id: '01a1213c-eded-731a-8c5d-38a5ee80ac48',
  code: 'TID00S3N',
  companyName: 'شركة النخبة للاستشارات',
  contactName: 'سلمان النخبة',
  sector: { nameAr: 'استشارات', nameEn: 'Consulting' },
  status: 'INACTIVE',
  appAccessEnabled: false,
};

export const WEJNAD_DETAIL: ClientDetailResponse = {
  id: '01a1213c-eddd-74cc-a645-d3a6fea51fa2',
  code: 'TID00S1W',
  companyName: 'شركة وجناد العقارية',
  contactName: 'معاذ ذياب الصوغ',
  sector: { nameAr: 'عقارات', nameEn: 'Real estate' },
  status: 'ACTIVE',
  appAccessEnabled: true,
  email: 'info@wejnad.sa',
  phone: '+966558500024',
  website: 'https://wejnad.sa',
  legalRepresentative: 'معاذ ذياب الصوغ',
  driveUrl: 'https://drive.google.com/',
  contractStartDate: '2025-06-01T00:00:00.000Z',
  renewalPeriodMonths: 3,
  team: [
    { userId: 'u1', displayName: 'فهد القحطاني', teamRole: 'MARKETING_MANAGER' },
    { userId: 'u2', displayName: 'عبدالله السعيد', teamRole: 'EXECUTION' },
  ],
};

export const SUMMARY_FIXTURES: ClientSummaryResponse[] = [
  JABR_SUMMARY,
  NUKHBA_SUMMARY,
  WEJNAD_DETAIL,
];

export const CLIENT_SUMMARIES: ClientSummary[] = SUMMARY_FIXTURES.map(toClientSummary);
export const WEJNAD_OVERVIEW: ClientOverview = toClientOverview(WEJNAD_DETAIL);

/** A ClientsApi that answers from the fixtures; pass `overrides` to change one method. */
export function fakeClientsApi(
  overrides: Partial<Record<'list' | 'overview', unknown>> = {},
): Pick<ClientsApi, 'list' | 'overview'> {
  return {
    list: (): Observable<ClientSummary[]> => of(CLIENT_SUMMARIES),
    overview: (id: string): Observable<ClientOverview | null> =>
      of(id === WEJNAD_DETAIL.id ? WEJNAD_OVERVIEW : null),
    ...overrides,
  } as Pick<ClientsApi, 'list' | 'overview'>;
}
