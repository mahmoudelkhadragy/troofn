import { PrismaService } from '../src/database/index.js';
import { seedDemoData } from '../src/seed/demo.seed.js';
import { createTestApp, DEMO_PASSWORD } from './helpers/app.js';

/** The startup seed adds what is missing; only `pnpm db:seed` (overwrite) resets rows. */
describe('Demo seed (e2e)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await seedDemoData(prisma, DEMO_PASSWORD, { overwrite: true }); // restore the shared database
    await app.close();
  });

  it('leaves existing users alone: a changed password and a lock survive a restart', async () => {
    const lockedUntil = new Date(Date.now() + 3_600_000);
    await prisma.user.update({
      where: { username: 'ahmed.employee' },
      data: { passwordHash: 'changed-by-someone', failedLoginAttempts: 3, lockedUntil },
    });

    const result = await seedDemoData(prisma, DEMO_PASSWORD, { overwrite: false });

    const user = await prisma.user.findUniqueOrThrow({ where: { username: 'ahmed.employee' } });
    expect(user.passwordHash).toBe('changed-by-someone');
    expect(user.failedLoginAttempts).toBe(3);
    expect(user.lockedUntil).not.toBeNull();
    expect(result.createdUsers).toBe(0);
  });

  it('creates only the users that are missing, with their client and team links', async () => {
    await prisma.user.delete({ where: { username: 'fahad.mm' } });

    const result = await seedDemoData(prisma, DEMO_PASSWORD, { overwrite: false });

    expect(result.createdUsers).toBe(1);
    const user = await prisma.user.findUniqueOrThrow({
      where: { username: 'fahad.mm' },
      include: { clientTeams: true },
    });
    expect(user.passwordHash).not.toBe('changed-by-someone');
    expect(user.clientTeams).toHaveLength(2);
  });

  it('overwrite resets a user to the known password and an unlocked state', async () => {
    const result = await seedDemoData(prisma, DEMO_PASSWORD, { overwrite: true });

    const user = await prisma.user.findUniqueOrThrow({ where: { username: 'ahmed.employee' } });
    expect(user.passwordHash).not.toBe('changed-by-someone');
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lockedUntil).toBeNull();
    expect(result.createdUsers).toBe(0);
  });
});
