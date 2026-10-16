import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/index.js';
import { PrismaService } from '../../database/index.js';
import { seedDemoData } from '../../seed/demo.seed.js';
import { isStrongPassword } from '../auth/password.js';
import { AccessControlService } from './access-control.service.js';
import { syncRbac } from './rbac.sync.js';

/**
 * Makes the database ready every time the API starts, so a deploy needs no manual step:
 *  1. Copies rbac.matrix.ts into the roles / permissions / role_permissions tables. No
 *     migration inserts them, so without this a fresh database would reject every sign-in.
 *  2. With SEED_DEMO_DATA=true (testing server), adds the demo clients and one user per role
 *     that are missing. Existing rows are never changed, so a restart keeps changed passwords.
 *
 * Skipped in tests: the e2e setup seeds the database, and tests change grants on purpose.
 * If it fails in production the API refuses to start (a running API with stale permissions
 * would answer 403 to everyone); elsewhere it logs and carries on.
 */
@Injectable()
export class StartupDataService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StartupDataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const env = this.config.get('app.env', { infer: true });
    if (env === 'test') return;

    try {
      const { roles, permissions, grants } = await syncRbac(this.prisma);
      this.accessControl.invalidate();
      this.logger.log(`RBAC synced: ${roles} roles, ${permissions} permissions, ${grants} grants`);

      if (this.config.get('seed.demoData', { infer: true })) await this.seedDemo();
    } catch (error) {
      if (env === 'production') throw error;
      this.logger.error('Startup data failed; the database may be out of date', error);
    }
  }

  private async seedDemo(): Promise<void> {
    const password = this.config.get('seed.password', { infer: true });
    if (!isStrongPassword(password)) {
      throw new Error(
        'SEED_DEMO_DATA=true needs SEED_DEFAULT_PASSWORD (8+ characters, a letter and a digit)',
      );
    }
    this.logger.warn('SEED_DEMO_DATA is on: demo users share one known password. Testing only.');
    const { clients, users, createdUsers } = await seedDemoData(this.prisma, password, {
      overwrite: false,
    });
    this.logger.log(
      `Demo data: ${clients} clients and ${users} users checked, ${createdUsers} users created`,
    );
  }
}
