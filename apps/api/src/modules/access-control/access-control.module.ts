import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service.js';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';

/** Authorization: permission checks (global guard), scopes, and the roles endpoint. */
@Global()
@Module({
  controllers: [RolesController],
  providers: [AccessControlService, RolesService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
