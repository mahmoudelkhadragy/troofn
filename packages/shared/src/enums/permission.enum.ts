/**
 * Every action in the system, as `module.action` keys. The API checks these
 * (not role names) on each endpoint; the dashboard and the app use them to
 * decide which screens to show. Which role gets which key, and on which rows,
 * is defined in apps/api/src/modules/access-control/rbac.matrix.ts.
 * See docs/03-roles-and-permissions.md.
 */
export enum Permission {
  // ── Identity & access ──
  USERS_READ = 'users.read',
  USERS_CREATE = 'users.create',
  USERS_UPDATE = 'users.update',
  USERS_RESET_PASSWORD = 'users.reset_password',
  ROLES_READ = 'roles.read',

  // ── Central administration ──
  CLIENTS_READ = 'clients.read',
  CLIENTS_MANAGE = 'clients.manage',
  CONTRACTS_READ = 'contracts.read',
  CONTRACTS_MANAGE = 'contracts.manage',
  WORK_PLANS_READ = 'work_plans.read',
  WORK_PLANS_MANAGE = 'work_plans.manage',
  T360_READ = 't360.read',
  T360_MANAGE = 't360.manage',
  STRATEGY_READ = 'strategy.read',
  STRATEGY_MANAGE = 'strategy.manage',
  SOW_READ = 'sow.read',
  SOW_MANAGE = 'sow.manage',
  REQUESTS_READ = 'requests.read',
  REQUESTS_CREATE = 'requests.create',
  REQUESTS_MANAGE = 'requests.manage',
  REPORTS_READ = 'reports.read',
  REPORTS_MANAGE = 'reports.manage',
  MEETINGS_READ = 'meetings.read',
  MEETINGS_CREATE = 'meetings.create',
  MEETINGS_MANAGE = 'meetings.manage',
  ACTIVITY_READ = 'activity.read',

  // ── Finance ──
  INVOICES_READ = 'invoices.read',
  INVOICES_MANAGE = 'invoices.manage',
  PAYMENTS_READ = 'payments.read',
  PAYMENTS_CREATE = 'payments.create',
  PAYMENTS_MANAGE = 'payments.manage',
  PAYMENT_METHODS_MANAGE = 'payment_methods.manage',

  // ── Projects & production ──
  PROJECTS_READ = 'projects.read',
  PROJECTS_MANAGE = 'projects.manage',
  TASKS_READ = 'tasks.read',
  TASKS_UPDATE_STATUS = 'tasks.update_status',
  TASKS_MANAGE = 'tasks.manage',
  PRODUCTION_FILES_READ = 'production_files.read',
  PRODUCTION_FILES_MANAGE = 'production_files.manage',
  TAPA_READ = 'tapa.read',
  TAPA_MANAGE = 'tapa.manage',
  CHAT_READ = 'chat.read',
  CHAT_SEND = 'chat.send',

  // ── Leads ──
  LEADS_READ = 'leads.read',
  LEADS_MANAGE = 'leads.manage',

  // ── HR ──
  EMPLOYEES_READ = 'employees.read',
  EMPLOYEES_MANAGE = 'employees.manage',
  PAYROLL_MANAGE = 'payroll.manage',
  ATTENDANCE_MANAGE = 'attendance.manage',
  LEAVES_APPROVE = 'leaves.approve',
  HR_SELF_SERVICE = 'hr.self_service',
}

/**
 * Which rows a granted permission covers. A const object (not a TS enum) so its
 * values are plain string literals, assignable to the Prisma `PermissionScope` type.
 */
export const PermissionScope = {
  /** Every row. */
  ALL: 'ALL',
  /** Rows of clients / projects the user is assigned to. */
  ASSIGNED: 'ASSIGNED',
  /** Rows of the user's own client company. */
  OWN_CLIENT: 'OWN_CLIENT',
  /** Rows that belong to the user. */
  OWN: 'OWN',
} as const;
export type PermissionScope = (typeof PermissionScope)[keyof typeof PermissionScope];
