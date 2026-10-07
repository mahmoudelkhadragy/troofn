import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Permission } from '@troofn/shared';
import type { Paginated } from '../../common/interceptors/transform-response.interceptor.js';
import { Access, type AccessContext, RequirePermissions } from '../access-control/index.js';
import {
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
  UserResponseDto,
  UsersQueryDto,
} from './dto/index.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Missing the users.* permission' })
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions(Permission.USERS_READ)
  @ApiOperation({ summary: 'List users (paginated; filter by role, status, client; search)' })
  @ApiOkResponse({ type: [UserResponseDto] })
  findAll(
    @Access() access: AccessContext,
    @Query() query: UsersQueryDto,
  ): Promise<Paginated<UserResponseDto>> {
    return this.users.findAll(access, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.USERS_READ)
  @ApiOperation({ summary: 'One user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse()
  findOne(
    @Access() access: AccessContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.users.findOne(access, id);
  }

  @Post()
  @RequirePermissions(Permission.USERS_CREATE)
  @ApiOperation({ summary: 'Create a staff user or a client login ("صلاحيات التطبيق")' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Validation, or role / client mismatch' })
  @ApiConflictResponse({ description: 'Username or email already in use' })
  create(@Access() access: AccessContext, @Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.users.create(access, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USERS_UPDATE)
  @ApiOperation({
    summary: 'Edit profile, role, client or status (deactivating ends their sessions)',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse()
  update(
    @Access() access: AccessContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.users.update(access, id, dto);
  }

  @Post(':id/reset-password')
  @RequirePermissions(Permission.USERS_RESET_PASSWORD)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a temporary password; the user must change it at next login' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  resetPassword(
    @Access() access: AccessContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    return this.users.resetPassword(access, id, dto);
  }
}
