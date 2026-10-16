import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service.js';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';
import { StartupDataService } from './startup-data.service.js';

/** Authorization: permission checks (global guard), scopes, the roles endpoint, and the startup data (RBAC sync, optional demo data). */
@Global()
@Module({
  controllers: [RolesController],
  providers: [AccessControlService, RolesService, StartupDataService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
