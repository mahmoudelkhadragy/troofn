/**
 * What the clients screens show. ClientsApi builds these from the API's client profile
 * (clients.mapper.ts); the parts the API cannot provide yet come from data/sample-sections.ts, so
 * the screens do not change when the real data for them arrives.
 */

export type ClientStatus = 'ACTIVE' | 'INACTIVE';

/** One row of the sidebar list. */
export interface ClientSummary {
  id: string;
  name: string;
  /** Short line under the name, e.g. "عقارات". */
  sector: string;
  status: ClientStatus;
  /** Unread items for this client (chat, requests, …). 0 hides the badge. */
  unreadCount: number;
}

/** A figure card in the row under the tabs. `note` is a percentage or a date, shown in accent. */
export interface StatCard {
  label: string;
  amount: number;
  currency: 'SAR';
  note: string;
}

export interface ToggleOption {
  label: string;
  enabled: boolean;
}

/** The "التطبيق" card: the client's app access switch and its SOW switches. */
export interface AppAccess {
  enabled: boolean;
  /** Score out of 10 shown in the pill. */
  rating: number;
  sow: ToggleOption[];
}

export interface ContractInfo {
  code: string;
  /** ISO date (yyyy-MM-dd); null when the contract has not started or is unknown. */
  startDate: string | null;
  endDate: string;
  annualValue: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
}

/** Any of them can be missing on a client; the card then shows a dash. */
export interface ContactInfo {
  phone: string | null;
  email: string | null;
  /** As stored, usually with "https://". */
  website: string | null;
}

/** milestone = T360 (red circle), phase = strategic plan / SOW (orange), monthly = 7SC (grey, with amount). */
export type TimelineKind = 'milestone' | 'phase' | 'monthly';

export interface TimelineStep {
  label: string;
  kind: TimelineKind;
  amount?: number;
}

export interface ProjectTimeline {
  title: string;
  steps: TimelineStep[];
}

/** Everything the "نظرة عامة" page needs for one client. */
export interface ClientOverview extends ClientSummary {
  /** Longer description of the business, shown in the page header. */
  activity: string;
  contactName: string;
  stats: StatCard[];
  appAccess: AppAccess;
  contract: ContractInfo;
  team: TeamMember[];
  contact: ContactInfo;
  timeline: ProjectTimeline;
}
