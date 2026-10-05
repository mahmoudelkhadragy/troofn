import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { AppConfig } from '../config/index.js';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Prisma client shared across the app. It connects lazily on the first query,
 * so the API can boot (and serve /health) even while the database is down.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<AppConfig, true>) {
    super({
      adapter: new PrismaPg({ connectionString: config.get('database.url', { infer: true }) }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
