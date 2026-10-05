import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/index.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check: vi.fn() } },
        { provide: PrismaHealthIndicator, useValue: { pingCheck: vi.fn() } },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('reports the process as alive', () => {
    expect(controller.live()).toMatchObject({ status: 'ok' });
  });
});
