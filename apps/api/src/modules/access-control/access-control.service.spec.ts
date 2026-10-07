import { Permission } from '@troofn/shared';
import { AccessControlService } from './access-control.service.js';

/** Stands in for PrismaService: serves grant rows and counts how often it is asked. */
function fakeDatabase(rows: { role: string; permission: string; scope: string }[]) {
  const db = {
    calls: 0,
    rolePermission: {
      findMany: async () => {
        db.calls++;
        return rows.map((r) => ({
          scope: r.scope,
          role: { key: r.role },
          permission: { key: r.permission },
        }));
      },
    },
  };
  return db;
}

describe('AccessControlService', () => {
  const rows = [
    { role: 'admin', permission: 'clients.read', scope: 'ALL' },
    { role: 'marketing_manager', permission: 'clients.read', scope: 'ASSIGNED' },
  ];

  it('returns the scope a role has for a permission', async () => {
    const service = new AccessControlService(fakeDatabase(rows) as never);
    await expect(service.scopeFor('marketing_manager', Permission.CLIENTS_READ)).resolves.toBe(
      'ASSIGNED',
    );
  });

  it('returns undefined when the role lacks the permission', async () => {
    const service = new AccessControlService(fakeDatabase(rows) as never);
    await expect(service.scopeFor('employee', Permission.CLIENTS_READ)).resolves.toBeUndefined();
    await expect(service.scopeFor('admin', Permission.USERS_READ)).resolves.toBeUndefined();
  });

  it('loads grants once, then serves them from the cache', async () => {
    const db = fakeDatabase(rows);
    const service = new AccessControlService(db as never);
    await service.scopeFor('admin', Permission.CLIENTS_READ);
    await service.scopeFor('marketing_manager', Permission.CLIENTS_READ);
    expect(db.calls).toBe(1);
  });

  it('reloads after the cache expires, or when invalidated', async () => {
    const db = fakeDatabase(rows);
    const service = new AccessControlService(db as never);
    await service.scopeFor('admin', Permission.CLIENTS_READ);

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + AccessControlService.CACHE_TTL_MS + 1);
    await service.scopeFor('admin', Permission.CLIENTS_READ);
    vi.useRealTimers();
    expect(db.calls).toBe(2);

    service.invalidate();
    await service.scopeFor('admin', Permission.CLIENTS_READ);
    expect(db.calls).toBe(3);
  });
});
