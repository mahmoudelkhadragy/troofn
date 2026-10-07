import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Permission } from '@troofn/shared';
import type { Paginated } from '../../common/interceptors/transform-response.interceptor.js';
import { Access, type AccessContext, RequirePermissions } from '../access-control/index.js';
import { ClientsService } from './clients.service.js';
import { ClientDetailDto, ClientsQueryDto, ClientSummaryDto } from './dto/index.js';

@ApiTags('Clients')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Missing clients.read' })
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @RequirePermissions(Permission.CLIENTS_READ)
  @ApiOperation({
    summary: 'Clients visible to the caller (admin: all · manager: assigned · client user: own)',
  })
  @ApiOkResponse({ type: [ClientSummaryDto] })
  findAll(
    @Access() access: AccessContext,
    @Query() query: ClientsQueryDto,
  ): Promise<Paginated<ClientSummaryDto>> {
    return this.clients.findAll(access, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.CLIENTS_READ)
  @ApiOperation({ summary: 'Client profile with its team (404 when outside your scope)' })
  @ApiOkResponse({ type: ClientDetailDto })
  @ApiNotFoundResponse()
  findOne(
    @Access() access: AccessContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClientDetailDto> {
    return this.clients.findOne(access, id);
  }
}
