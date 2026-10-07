import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Permission } from '@troofn/shared';
import { RequirePermissions } from './decorators/index.js';
import { RoleResponseDto } from './dto/role-response.dto.js';
import { RolesService } from './roles.service.js';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions(Permission.ROLES_READ)
  @ApiOperation({
    summary: 'Roles with their permissions and scopes (the "app permissions" dropdown)',
  })
  @ApiOkResponse({ type: [RoleResponseDto] })
  @ApiForbiddenResponse({ description: 'Missing roles.read' })
  findAll(): Promise<RoleResponseDto[]> {
    return this.roles.findAll();
  }
}
