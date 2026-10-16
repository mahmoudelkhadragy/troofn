import { Permission, PermissionScope, Role } from '@troofn/shared';
import {
  PERMISSION_DEFINITIONS,
  RBAC_MATRIX,
  ROLE_DEFINITIONS,
  type RbacMatrix,
  validateRbacMatrix,
} from './rbac.matrix.js';

const allRoles = Object.values(Role);
const allPermissions = Object.values(Permission);

describe('RBAC matrix', () => {
  it('defines every role and every permission', () => {
    expect(Object.keys(ROLE_DEFINITIONS).sort()).toEqual([...allRoles].sort());
    expect(Object.keys(PERMISSION_DEFINITIONS).sort()).toEqual([...allPermissions].sort());
    expect(Object.keys(RBAC_MATRIX).sort()).toEqual([...allRoles].sort());
  });

  it('passes its own validation', () => {
    expect(validateRbacMatrix(RBAC_MATRIX)).toEqual([]);
  });

  it('gives admin everything with scope ALL, except payment cards, HR self-service and owner-only permissions', () => {
    const adminGrants = RBAC_MATRIX[Role.ADMIN];
    const excluded = [
      Permission.PAYMENT_METHODS_MANAGE,
      Permission.HR_SELF_SERVICE,
      Permission.USERS_DELETE,
      Permission.CLIENTS_DELETE,
      Permission.APPROVALS_DECIDE,
      Permission.USERS_MANAGE_ADMINS,
    ];
    for (const permission of allPermissions) {
      if (excluded.includes(permission)) expect(adminGrants[permission]).toBeUndefined();
      else expect(adminGrants[permission]).toBe(PermissionScope.ALL);
    }
  });

  it('gives the owner everything except payment cards and HR self-service', () => {
    const grants = RBAC_MATRIX[Role.OWNER];
    expect(grants[Permission.CLIENTS_DELETE]).toBe(PermissionScope.ALL);
    expect(grants[Permission.USERS_MANAGE_ADMINS]).toBe(PermissionScope.ALL);
    expect(grants[Permission.APPROVALS_DECIDE]).toBe(PermissionScope.ALL);
    expect(grants[Permission.PAYMENT_METHODS_MANAGE]).toBeUndefined();
    expect(grants[Permission.HR_SELF_SERVICE]).toBeUndefined();
  });

  it('keeps delete and admin-management away from the admin', () => {
    const grants = RBAC_MATRIX[Role.ADMIN];
    expect(grants[Permission.CLIENTS_DELETE]).toBeUndefined();
    expect(grants[Permission.USERS_DELETE]).toBeUndefined();
    expect(grants[Permission.USERS_MANAGE_ADMINS]).toBeUndefined();
    expect(grants[Permission.APPROVALS_DECIDE]).toBeUndefined();
    expect(grants[Permission.APPROVALS_REQUEST]).toBe(PermissionScope.ALL);
  });

  it('lets only owner and admin open the dashboard', () => {
    const withDashboard = allRoles.filter((role) => RBAC_MATRIX[role][Permission.APP_DASHBOARD]);
    expect([...withDashboard].sort()).toEqual([Role.ADMIN, Role.OWNER].sort());
  });

  it('lets every role open the mobile app', () => {
    for (const role of allRoles) {
      expect(RBAC_MATRIX[role][Permission.APP_MOBILE]).toBeDefined();
    }
  });

  it('limits the marketing manager to assigned clients, but all leads', () => {
    const grants = RBAC_MATRIX[Role.MARKETING_MANAGER];
    expect(grants[Permission.CLIENTS_READ]).toBe(PermissionScope.ASSIGNED);
    expect(grants[Permission.TAPA_MANAGE]).toBe(PermissionScope.ASSIGNED);
    expect(grants[Permission.LEADS_MANAGE]).toBe(PermissionScope.ALL);
    expect(grants[Permission.USERS_READ]).toBeUndefined();
  });

  it('gives the content writer read-only TAPA and no client access', () => {
    const grants = RBAC_MATRIX[Role.CONTENT_WRITER];
    expect(grants[Permission.TAPA_READ]).toBe(PermissionScope.ASSIGNED);
    expect(grants[Permission.TAPA_MANAGE]).toBeUndefined();
    expect(grants[Permission.CLIENTS_READ]).toBeUndefined();
  });

  it('limits the employee to own tasks, team chat, HR self-service and the mobile app', () => {
    expect(RBAC_MATRIX[Role.EMPLOYEE]).toEqual({
      [Permission.TASKS_READ]: PermissionScope.OWN,
      [Permission.TASKS_UPDATE_STATUS]: PermissionScope.OWN,
      [Permission.CHAT_READ]: PermissionScope.ASSIGNED,
      [Permission.CHAT_SEND]: PermissionScope.ASSIGNED,
      [Permission.HR_SELF_SERVICE]: PermissionScope.OWN,
      [Permission.APP_MOBILE]: PermissionScope.OWN,
    });
  });

  it('keeps the client marketing officer away from finance', () => {
    const grants = RBAC_MATRIX[Role.CLIENT_MARKETING_OFFICER];
    expect(grants[Permission.SOW_READ]).toBe(PermissionScope.OWN_CLIENT);
    expect(grants[Permission.INVOICES_READ]).toBeUndefined();
    expect(grants[Permission.PAYMENT_METHODS_MANAGE]).toBeUndefined();
    expect(grants[Permission.CONTRACTS_READ]).toBeUndefined();
  });

  it('keeps the client accountant to contracts and finance', () => {
    const grants = RBAC_MATRIX[Role.CLIENT_ACCOUNTANT];
    expect(grants[Permission.CONTRACTS_READ]).toBe(PermissionScope.OWN_CLIENT);
    expect(grants[Permission.PAYMENT_METHODS_MANAGE]).toBe(PermissionScope.OWN_CLIENT);
    expect(grants[Permission.SOW_READ]).toBeUndefined();
    expect(grants[Permission.STRATEGY_READ]).toBeUndefined();
  });

  describe('validateRbacMatrix', () => {
    it('rejects a client role granted a scope wider than its own company', () => {
      const bad: RbacMatrix = {
        ...RBAC_MATRIX,
        [Role.CLIENT]: { [Permission.CLIENTS_READ]: PermissionScope.ALL },
      };
      expect(validateRbacMatrix(bad)).toEqual([
        'client: clients.read has scope ALL, but client roles may only use OWN_CLIENT or OWN',
      ]);
    });

    it('rejects a staff role granted OWN_CLIENT (staff have no client company)', () => {
      const bad: RbacMatrix = {
        ...RBAC_MATRIX,
        [Role.EMPLOYEE]: { [Permission.TASKS_READ]: PermissionScope.OWN_CLIENT },
      };
      expect(validateRbacMatrix(bad)).toEqual([
        'employee: tasks.read has scope OWN_CLIENT, but staff roles have no client company',
      ]);
    });
  });
});
