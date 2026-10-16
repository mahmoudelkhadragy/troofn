import { StartupDataService } from './startup-data.service.js';

const { syncRbac, seedDemoData } = vi.hoisted(() => ({ syncRbac: vi.fn(), seedDemoData: vi.fn() }));
vi.mock('./rbac.sync.js', () => ({ syncRbac }));
vi.mock('../../seed/demo.seed.js', () => ({ seedDemoData }));

function build(env: string, seed = { demoData: false, password: '' }) {
  const accessControl = { invalidate: vi.fn() };
  const values: Record<string, unknown> = {
    'app.env': env,
    'seed.demoData': seed.demoData,
    'seed.password': seed.password,
  };
  const config = { get: (key: string) => values[key] };
  const service = new StartupDataService({} as never, accessControl as never, config as never);
  return { service, accessControl };
}

describe('StartupDataService', () => {
  beforeEach(() => {
    syncRbac.mockReset();
    seedDemoData.mockReset();
    syncRbac.mockResolvedValue({ roles: 8, permissions: 50, grants: 300 });
    seedDemoData.mockResolvedValue({ clients: 3, users: 10, createdUsers: 10 });
  });

  it('syncs at startup and drops the grants cache', async () => {
    const { service, accessControl } = build('production');
    await service.onApplicationBootstrap();
    expect(syncRbac).toHaveBeenCalledTimes(1);
    expect(accessControl.invalidate).toHaveBeenCalledTimes(1);
  });

  it('does nothing in tests', async () => {
    const { service } = build('test', { demoData: true, password: 'Passw0rd!x' });
    await service.onApplicationBootstrap();
    expect(syncRbac).not.toHaveBeenCalled();
    expect(seedDemoData).not.toHaveBeenCalled();
  });

  it('refuses to start in production when the sync fails', async () => {
    syncRbac.mockRejectedValue(new Error('db down'));
    const { service } = build('production');
    await expect(service.onApplicationBootstrap()).rejects.toThrow('db down');
  });

  it('only logs a failed sync in development', async () => {
    syncRbac.mockRejectedValue(new Error('db down'));
    const { service, accessControl } = build('development');
    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(accessControl.invalidate).not.toHaveBeenCalled();
  });

  it('does not seed demo data unless SEED_DEMO_DATA is on', async () => {
    const { service } = build('production');
    await service.onApplicationBootstrap();
    expect(seedDemoData).not.toHaveBeenCalled();
  });

  it('adds missing demo data without overwriting when SEED_DEMO_DATA is on', async () => {
    const { service } = build('production', { demoData: true, password: 'Passw0rd!x' });
    await service.onApplicationBootstrap();
    expect(seedDemoData).toHaveBeenCalledWith(expect.anything(), 'Passw0rd!x', {
      overwrite: false,
    });
  });

  it('refuses to start in production when demo data is on with a weak password', async () => {
    const { service } = build('production', { demoData: true, password: 'weak' });
    await expect(service.onApplicationBootstrap()).rejects.toThrow('SEED_DEFAULT_PASSWORD');
    expect(seedDemoData).not.toHaveBeenCalled();
  });
});
