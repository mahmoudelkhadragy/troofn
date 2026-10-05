/**
 * System roles. Every API endpoint checks the role first, then data ownership.
 * See docs/03-roles-and-permissions.md.
 */
export enum Role {
  /** Troofn internal super user — manages the whole system from the dashboard. */
  ADMIN = 'admin',

  // ── Client side (scoped to their own client_id) ──
  CLIENT = 'client',
  CLIENT_MARKETING_OFFICER = 'client_marketing_officer',
  CLIENT_ACCOUNTANT = 'client_accountant',

  // ── Troofn employees ──
  MARKETING_MANAGER = 'marketing_manager',
  CONTENT_WRITER = 'content_writer',
  EMPLOYEE = 'employee',
}

export const CLIENT_ROLES: readonly Role[] = [
  Role.CLIENT,
  Role.CLIENT_MARKETING_OFFICER,
  Role.CLIENT_ACCOUNTANT,
];

export const TROOFN_STAFF_ROLES: readonly Role[] = [
  Role.ADMIN,
  Role.MARKETING_MANAGER,
  Role.CONTENT_WRITER,
  Role.EMPLOYEE,
];
