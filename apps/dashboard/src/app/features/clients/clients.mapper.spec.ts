import { toClientOverview, toClientSummary } from './clients.mapper';
import type { ClientDetailResponse } from './models/client-api.model';
import { JABR_SUMMARY, WEJNAD_DETAIL } from './testing/clients.fixtures';

describe('toClientSummary', () => {
  it('maps the sidebar row from the API client', () => {
    expect(toClientSummary(JABR_SUMMARY)).toEqual({
      id: JABR_SUMMARY.id,
      name: 'شركة الجبر للسيارات',
      sector: 'سيارات',
      status: 'ACTIVE',
      unreadCount: 0,
    });
  });

  it('has an empty sector when the client has none', () => {
    expect(toClientSummary({ ...JABR_SUMMARY, sector: null }).sector).toBe('');
  });
});

describe('toClientOverview', () => {
  const overview = toClientOverview(WEJNAD_DETAIL);

  it('uses what the API knows: identity, app access, contract start, team and contact details', () => {
    expect(overview).toMatchObject({
      id: WEJNAD_DETAIL.id,
      name: 'شركة وجناد العقارية',
      activity: 'عقارات',
      contactName: 'معاذ ذياب الصوغ',
      status: 'ACTIVE',
      contact: { phone: '+966558500024', email: 'info@wejnad.sa', website: 'https://wejnad.sa' },
    });
    expect(overview.appAccess.enabled).toBe(true);
    expect(overview.contract.startDate).toBe('2025-06-01');
  });

  it('names the team roles in Arabic', () => {
    expect(overview.team).toEqual([
      { id: 'u1', name: 'فهد القحطاني', role: 'مدير التسويق' },
      { id: 'u2', name: 'عبدالله السعيد', role: 'فريق التنفيذ' },
    ]);
  });

  it('follows the API for App Access, whatever the sample says', () => {
    const off = toClientOverview({ ...WEJNAD_DETAIL, appAccessEnabled: false });
    expect(off.appAccess.enabled).toBe(false);
  });

  it('fills the parts the API cannot provide yet with the sample figures', () => {
    expect(overview.stats).toHaveLength(5);
    expect(overview.appAccess.sow).toHaveLength(4);
    expect(overview.timeline.steps).toHaveLength(20);
    expect(overview.contract.annualValue).toBeGreaterThan(0);
  });

  it('gives every call its own copy of the sample, so editing one page never changes another', () => {
    const a = toClientOverview(WEJNAD_DETAIL);
    const b = toClientOverview(WEJNAD_DETAIL);
    a.appAccess.sow[0].enabled = true;
    a.timeline.steps[0].label = 'changed';
    expect(b.appAccess.sow[0].enabled).toBe(false);
    expect(b.timeline.steps[0].label).toBe('T360→I');
  });

  it('keeps missing details missing instead of inventing them', () => {
    const bare: ClientDetailResponse = {
      ...WEJNAD_DETAIL,
      email: null,
      phone: null,
      website: null,
      contractStartDate: null,
      team: [],
    };
    const result = toClientOverview(bare);
    expect(result.contact).toEqual({ phone: null, email: null, website: null });
    expect(result.contract.startDate).toBeNull();
    expect(result.team).toEqual([]);
  });
});
