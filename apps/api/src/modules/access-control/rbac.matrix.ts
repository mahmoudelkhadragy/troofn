import { Permission, PermissionScope, Role } from '@troofn/shared';

/**
 * Source of truth for roles and what they may do. The seed copies this into the
 * roles / permissions / role_permissions tables; at runtime the API reads the tables.
 * Change who-can-do-what here, re-run `pnpm db:seed`, and update docs/03.
 */

export type RoleAudience = 'STAFF' | 'CLIENT';

export interface RoleDefinition {
  nameAr: string;
  nameEn: string;
  audience: RoleAudience;
  description: string;
}

export interface PermissionDefinition {
  module: string;
  description: string;
}

/** role → (permission → scope). A missing permission means "not allowed". */
export type RbacMatrix = Record<Role, Partial<Record<Permission, PermissionScope>>>;

export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  [Role.ADMIN]: {
    nameAr: 'مدير النظام',
    nameEn: 'Troofn admin',
    audience: 'STAFF',
    description: 'Manages the whole system from the dashboard.',
  },
  [Role.MARKETING_MANAGER]: {
    nameAr: 'مدير تسويق تروفن',
    nameEn: 'Troofn marketing manager',
    audience: 'STAFF',
    description: 'Runs assigned clients and their projects; handles leads.',
  },
  [Role.CONTENT_WRITER]: {
    nameAr: 'كاتب المحتوى',
    nameEn: 'Content writer',
    audience: 'STAFF',
    description: 'Writes content for assigned projects.',
  },
  [Role.EMPLOYEE]: {
    nameAr: 'الموظف العادي',
    nameEn: 'Employee',
    audience: 'STAFF',
    description: 'Works on own assigned tasks; HR self-service.',
  },
  [Role.CLIENT]: {
    nameAr: 'مدير',
    nameEn: 'Client owner',
    audience: 'CLIENT',
    description: 'Owns the client account; sees everything about the company.',
  },
  [Role.CLIENT_MARKETING_OFFICER]: {
    nameAr: 'مدير التسويق',
    nameEn: 'Client marketing officer',
    audience: 'CLIENT',
    description: 'Follows the marketing side only: SOW, campaigns, reports.',
  },
  [Role.CLIENT_ACCOUNTANT]: {
    nameAr: 'مدير الحسابات',
    nameEn: 'Client accountant',
    audience: 'CLIENT',
    description: 'Follows the financial side only: contracts, invoices, payments.',
  },
};

const p = (description: string, module?: string) => ({ description, module });

const PERMISSION_DESCRIPTIONS: Record<Permission, { description: string; module?: string }> = {
  [Permission.USERS_READ]: p('List and view user accounts'),
  [Permission.USERS_CREATE]: p('Create staff and client user accounts'),
  [Permission.USERS_UPDATE]: p('Edit a user: profile, role, client, status'),
  [Permission.USERS_RESET_PASSWORD]: p("Reset a user's password"),
  [Permission.ROLES_READ]: p('View roles and their permissions'),
  [Permission.CLIENTS_READ]: p('View client profiles'),
  [Permission.CLIENTS_MANAGE]: p('Create, edit and deactivate clients'),
  [Permission.CONTRACTS_READ]: p('View contracts and their value'),
  [Permission.CONTRACTS_MANAGE]: p('Create, edit and upload contracts'),
  [Permission.WORK_PLANS_READ]: p('View work plans and stages'),
  [Permission.WORK_PLANS_MANAGE]: p('Edit work plans and stages'),
  [Permission.T360_READ]: p('View the T-360 index and competitor analysis'),
  [Permission.T360_MANAGE]: p('Edit T-360 axes, elements and competitors'),
  [Permission.STRATEGY_READ]: p('View the strategic plan'),
  [Permission.STRATEGY_MANAGE]: p('Edit the strategic plan'),
  [Permission.SOW_READ]: p('View SOW components and 7SC campaigns'),
  [Permission.SOW_MANAGE]: p('Edit SOW components and 7SC campaigns'),
  [Permission.REQUESTS_READ]: p('View client requests (SOW orders)'),
  [Permission.REQUESTS_CREATE]: p('Create a client request'),
  [Permission.REQUESTS_MANAGE]: p('Change request status, delete requests'),
  [Permission.REPORTS_READ]: p('View and download reports and campaign metrics'),
  [Permission.REPORTS_MANAGE]: p('Upload reports and campaign metrics'),
  [Permission.MEETINGS_READ]: p('View meetings'),
  [Permission.MEETINGS_CREATE]: p('Request a meeting'),
  [Permission.MEETINGS_MANAGE]: p('Schedule, edit and summarize meetings'),
  [Permission.ACTIVITY_READ]: p("View a client's app activity and audit feed"),
  [Permission.INVOICES_READ]: p('View invoices'),
  [Permission.INVOICES_MANAGE]: p('Generate and edit invoices'),
  [Permission.PAYMENTS_READ]: p('View payments and transfers'),
  [Permission.PAYMENTS_CREATE]: p('Record a transfer and upload a receipt'),
  [Permission.PAYMENTS_MANAGE]: p('Confirm or reject payments'),
  [Permission.PAYMENT_METHODS_MANAGE]: p("Add, change or remove the company's payment card"),
  [Permission.PROJECTS_READ]: p('View projects'),
  [Permission.PROJECTS_MANAGE]: p('Create and edit projects and their members'),
  [Permission.TASKS_READ]: p('View tasks'),
  [Permission.TASKS_UPDATE_STATUS]: p('Change the status of a task'),
  [Permission.TASKS_MANAGE]: p('Create, assign and edit tasks'),
  [Permission.PRODUCTION_FILES_READ]: p('View production files'),
  [Permission.PRODUCTION_FILES_MANAGE]: p('Upload production files and update their status'),
  [Permission.TAPA_READ]: p('View the TAPA audience analysis'),
  [Permission.TAPA_MANAGE]: p('Edit the TAPA audience analysis'),
  [Permission.CHAT_READ]: p('Read conversations'),
  [Permission.CHAT_SEND]: p('Send messages'),
  [Permission.LEADS_READ]: p('View the leads inbox'),
  [Permission.LEADS_MANAGE]: p('Add, update and delete leads'),
  [Permission.EMPLOYEES_READ]: p('View employees'),
  [Permission.EMPLOYEES_MANAGE]: p('Create and edit employees'),
  [Permission.PAYROLL_MANAGE]: p('Manage salaries, bonuses and deductions'),
  [Permission.ATTENDANCE_MANAGE]: p('Manage attendance records'),
  [Permission.LEAVES_APPROVE]: p('Approve or reject leave requests'),
  [Permission.HR_SELF_SERVICE]: p('Own salary, attendance, rating and leave requests'),
};

/** `clients.read` → module `clients`. */
export const PERMISSION_DEFINITIONS = Object.fromEntries(
  Object.entries(PERMISSION_DESCRIPTIONS).map(([key, { description, module }]) => [
    key,
    { description, module: module ?? key.split('.')[0] },
  ]),
) as Record<Permission, PermissionDefinition>;

const { ALL, ASSIGNED, OWN_CLIENT, OWN } = PermissionScope;

/** Admin gets everything except the client-only card screen and staff self-service. */
const ADMIN_EXCLUDED = new Set<Permission>([
  Permission.PAYMENT_METHODS_MANAGE,
  Permission.HR_SELF_SERVICE,
]);

export const RBAC_MATRIX: RbacMatrix = {
  [Role.ADMIN]: Object.fromEntries(
    Object.values(Permission)
      .filter((permission) => !ADMIN_EXCLUDED.has(permission))
      .map((permission) => [permission, ALL]),
  ),

  [Role.MARKETING_MANAGER]: {
    [Permission.CLIENTS_READ]: ASSIGNED,
    [Permission.CONTRACTS_READ]: ASSIGNED,
    [Permission.WORK_PLANS_READ]: ASSIGNED,
    [Permission.T360_READ]: ASSIGNED,
    [Permission.STRATEGY_READ]: ASSIGNED,
    [Permission.SOW_READ]: ASSIGNED,
    [Permission.REQUESTS_READ]: ASSIGNED,
    [Permission.REPORTS_READ]: ASSIGNED,
    [Permission.MEETINGS_READ]: ASSIGNED,
    [Permission.MEETINGS_CREATE]: ASSIGNED,
    [Permission.MEETINGS_MANAGE]: ASSIGNED,
    [Permission.PROJECTS_READ]: ASSIGNED,
    [Permission.PROJECTS_MANAGE]: ASSIGNED,
    [Permission.TASKS_READ]: ASSIGNED,
    [Permission.TASKS_UPDATE_STATUS]: ASSIGNED,
    [Permission.TASKS_MANAGE]: ASSIGNED,
    [Permission.PRODUCTION_FILES_READ]: ASSIGNED,
    [Permission.PRODUCTION_FILES_MANAGE]: ASSIGNED,
    [Permission.TAPA_READ]: ASSIGNED,
    [Permission.TAPA_MANAGE]: ASSIGNED,
    [Permission.CHAT_READ]: ASSIGNED,
    [Permission.CHAT_SEND]: ASSIGNED,
    [Permission.LEADS_READ]: ALL,
    [Permission.LEADS_MANAGE]: ALL,
    [Permission.HR_SELF_SERVICE]: OWN,
  },

  [Role.CONTENT_WRITER]: {
    [Permission.PROJECTS_READ]: ASSIGNED,
    [Permission.TASKS_READ]: OWN,
    [Permission.TASKS_UPDATE_STATUS]: OWN,
    [Permission.PRODUCTION_FILES_READ]: ASSIGNED,
    [Permission.PRODUCTION_FILES_MANAGE]: ASSIGNED,
    [Permission.TAPA_READ]: ASSIGNED,
    [Permission.CHAT_READ]: ASSIGNED,
    [Permission.CHAT_SEND]: ASSIGNED,
    [Permission.HR_SELF_SERVICE]: OWN,
  },

  [Role.EMPLOYEE]: {
    [Permission.TASKS_READ]: OWN,
    [Permission.TASKS_UPDATE_STATUS]: OWN,
    [Permission.CHAT_READ]: ASSIGNED,
    [Permission.CHAT_SEND]: ASSIGNED,
    [Permission.HR_SELF_SERVICE]: OWN,
  },

  [Role.CLIENT]: {
    [Permission.CLIENTS_READ]: OWN_CLIENT,
    [Permission.CONTRACTS_READ]: OWN_CLIENT,
    [Permission.WORK_PLANS_READ]: OWN_CLIENT,
    [Permission.T360_READ]: OWN_CLIENT,
    [Permission.STRATEGY_READ]: OWN_CLIENT,
    [Permission.SOW_READ]: OWN_CLIENT,
    [Permission.REQUESTS_READ]: OWN_CLIENT,
    [Permission.REQUESTS_CREATE]: OWN_CLIENT,
    [Permission.REPORTS_READ]: OWN_CLIENT,
    [Permission.MEETINGS_READ]: OWN_CLIENT,
    [Permission.MEETINGS_CREATE]: OWN_CLIENT,
    [Permission.INVOICES_READ]: OWN_CLIENT,
    [Permission.PAYMENTS_READ]: OWN_CLIENT,
    [Permission.PAYMENTS_CREATE]: OWN_CLIENT,
    [Permission.PAYMENT_METHODS_MANAGE]: OWN_CLIENT,
    [Permission.CHAT_READ]: OWN_CLIENT,
    [Permission.CHAT_SEND]: OWN_CLIENT,
  },

  [Role.CLIENT_MARKETING_OFFICER]: {
    [Permission.CLIENTS_READ]: OWN_CLIENT,
    [Permission.T360_READ]: OWN_CLIENT,
    [Permission.STRATEGY_READ]: OWN_CLIENT,
    [Permission.SOW_READ]: OWN_CLIENT,
    [Permission.REQUESTS_READ]: OWN_CLIENT,
    [Permission.REQUESTS_CREATE]: OWN_CLIENT,
    [Permission.REPORTS_READ]: OWN_CLIENT,
    [Permission.MEETINGS_READ]: OWN_CLIENT,
    [Permission.MEETINGS_CREATE]: OWN_CLIENT,
    [Permission.CHAT_READ]: OWN_CLIENT,
    [Permission.CHAT_SEND]: OWN_CLIENT,
  },

  [Role.CLIENT_ACCOUNTANT]: {
    [Permission.CLIENTS_READ]: OWN_CLIENT,
    [Permission.CONTRACTS_READ]: OWN_CLIENT,
    [Permission.REQUESTS_READ]: OWN_CLIENT,
    [Permission.REQUESTS_CREATE]: OWN_CLIENT,
    [Permission.INVOICES_READ]: OWN_CLIENT,
    [Permission.PAYMENTS_READ]: OWN_CLIENT,
    [Permission.PAYMENTS_CREATE]: OWN_CLIENT,
    [Permission.PAYMENT_METHODS_MANAGE]: OWN_CLIENT,
  },
};

const CLIENT_SCOPES: readonly PermissionScope[] = [OWN_CLIENT, OWN];

/** Returns human-readable problems; an empty array means the matrix is valid. */
export function validateRbacMatrix(matrix: RbacMatrix): string[] {
  const errors: string[] = [];
  for (const [role, grants] of Object.entries(matrix) as [Role, RbacMatrix[Role]][]) {
    const audience = ROLE_DEFINITIONS[role].audience;
    for (const [permission, scope] of Object.entries(grants) as [Permission, PermissionScope][]) {
      if (audience === 'CLIENT' && !CLIENT_SCOPES.includes(scope)) {
        errors.push(
          `${role}: ${permission} has scope ${scope}, but client roles may only use OWN_CLIENT or OWN`,
        );
      }
      if (audience === 'STAFF' && scope === OWN_CLIENT) {
        errors.push(
          `${role}: ${permission} has scope ${scope}, but staff roles have no client company`,
        );
      }
    }
  }
  return errors;
}
