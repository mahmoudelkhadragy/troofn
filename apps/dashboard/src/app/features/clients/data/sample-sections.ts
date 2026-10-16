import type {
  AppAccess,
  ContractInfo,
  StatCard,
  TimelineStep,
  ProjectTimeline,
} from '../models/client.model';

/**
 * The parts of the overview page the API cannot provide yet (no tables for them): the figure
 * cards, the SOW switches and rating, the contract code / end date / value, and the project
 * timeline. They are the Figma sample figures, the same for every client, until the modules
 * behind them are built. Anything the API does return is mapped in clients.mapper.ts instead.
 */

const monthly = (n: number): TimelineStep => ({
  label: `7SC ${String(n).padStart(2, '0')}`,
  kind: 'monthly',
  amount: 18_900,
});

const TIMELINE_STEPS: TimelineStep[] = [
  { label: 'T360→I', kind: 'milestone' },
  { label: 'Strategic plan', kind: 'phase' },
  { label: 'SOW 1.0', kind: 'phase' },
  monthly(1),
  monthly(2),
  monthly(3),
  { label: 'SOW 2.0', kind: 'phase' },
  monthly(4),
  monthly(5),
  monthly(6),
  { label: 'T360 II', kind: 'milestone' },
  { label: 'SOW 3.0', kind: 'phase' },
  monthly(7),
  monthly(8),
  monthly(9),
  { label: 'SOW 4.0', kind: 'phase' },
  monthly(10),
  monthly(11),
  monthly(12),
  { label: 'T360→IV', kind: 'milestone' },
];

export interface SampleSections {
  stats: StatCard[];
  /** The SOW switches and the rating; `enabled` (App Access) comes from the API. */
  appAccess: Omit<AppAccess, 'enabled'>;
  /** Everything but the start date, which comes from the API. */
  contract: Omit<ContractInfo, 'startDate'>;
  timeline: ProjectTimeline;
}

/** A fresh copy each time, so one client's page can never change another's. */
export function sampleSections(): SampleSections {
  return {
    stats: [
      { label: 'المبلغ المستحق', amount: 21_400, currency: 'SAR', note: '20/03/2026' },
      { label: 'مبلغ التشغيل', amount: 21_400, currency: 'SAR', note: '30 %' },
      { label: 'مبلغ هامش الربح', amount: 21_400, currency: 'SAR', note: '30 %' },
      { label: 'قدرة محورية', amount: 21_400, currency: 'SAR', note: '40 %' },
      { label: 'مبلغ الربح السنوي', amount: 21_400, currency: 'SAR', note: '30 %' },
    ],
    appAccess: {
      rating: 8.9,
      sow: [
        { label: 'SOW 1.0', enabled: false },
        { label: 'SOW 2.0', enabled: false },
        { label: 'SOW 3.0', enabled: false },
        { label: 'SOW 4.0', enabled: false },
      ],
    },
    contract: { code: 'MSATMS200', endDate: '2027-06-01', annualValue: 256_800 },
    timeline: {
      title: 'مسار المشروع — SOW 4.0',
      steps: TIMELINE_STEPS.map((step) => ({ ...step })),
    },
  };
}
