import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser, JwtPayload, LoginResponse } from '@troofn/shared';
import type { Request } from 'express';
import { AllowPendingPasswordChange, CurrentUser, Public } from '../../common/decorators/index.js';
import { AuthService } from './auth.service.js';
import {
  AuthUserDto,
  ChangePasswordDto,
  LoginDto,
  LoginResponseDto,
  RefreshTokenDto,
} from './dto/index.js';
import type { SessionMeta } from './sessions.service.js';

/** Per-IP limit for the endpoints that take credentials (AUTH_LOGIN_RATE_LIMIT per minute). */
const credentialsThrottle = {
  default: { limit: () => Number(process.env.AUTH_LOGIN_RATE_LIMIT ?? 5), ttl: 60_000 },
};

function sessionMeta(req: Request): SessionMeta {
  return { userAgent: req.get('user-agent'), ipAddress: req.ip };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @Public()
  @Throttle(credentialsThrottle)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with username and password' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid username or password' })
  @ApiForbiddenResponse({ description: 'User or client inactive, or app access disabled' })
  @ApiResponse({ status: 423, description: 'Locked after too many failed attempts' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit (per IP) exceeded' })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<LoginResponse> {
    return this.auth.login(dto, sessionMeta(req));
  }

  @Post('refresh')
  @Public()
  @Throttle(credentialsThrottle)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair (rotation)' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid, expired, revoked or reused refresh token' })
  refresh(@Body() dto: RefreshTokenDto): Promise<LoginResponse> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth()
  @AllowPendingPasswordChange()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End the current session' })
  @ApiNoContentResponse()
  logout(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.auth.logout(user);
  }

  @Post('logout-all')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End every session of the current user (all devices)' })
  @ApiNoContentResponse()
  logoutAll(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.auth.logoutAll(user);
  }

  @Get('me')
  @ApiBearerAuth()
  @AllowPendingPasswordChange()
  @ApiOperation({ summary: 'The signed-in user, role and permissions' })
  @ApiOkResponse({ type: AuthUserDto })
  me(@CurrentUser() user: JwtPayload): Promise<AuthUser> {
    return this.auth.me(user);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @AllowPendingPasswordChange()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password; other sessions are logged out' })
  @ApiOkResponse({ type: LoginResponseDto })
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<LoginResponse> {
    return this.auth.changePassword(user, dto, sessionMeta(req));
  }
}
