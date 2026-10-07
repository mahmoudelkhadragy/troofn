import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser, JwtPayload, LoginResponse } from '@troofn/shared';
import type { AppConfig } from '../../config/index.js';
import { PrismaService } from '../../database/index.js';
import { type AuthUserRow, authUserSelect, signInBlocker, toAuthUser } from './auth-user.mapper.js';
import type { ChangePasswordDto, LoginDto } from './dto/index.js';
import { hashPassword, verifyPassword } from './password.js';
import { type SessionMeta, SessionsService } from './sessions.service.js';
import { TokenService } from './token.service.js';

const INVALID_CREDENTIALS = 'Invalid username or password';

@Injectable()
export class AuthService {
  private readonly auth: AppConfig['auth'];
  /** Verified against when the username doesn't exist, so both paths take the same time. */
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly sessions: SessionsService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.auth = config.get('auth', { infer: true });
  }

  async login(dto: LoginDto, meta: SessionMeta): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      select: {
        ...authUserSelect,
        passwordHash: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    // 1. Unknown (or deleted) user: same answer and same timing as a wrong password.
    if (!user || user.deletedAt) {
      await verifyPassword(await this.getDummyHash(), dto.password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // 2. Locked after too many failures.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new HttpException('Too many failed attempts. Try again later.', HttpStatus.LOCKED);
    }

    // 3. Wrong password: count it, lock when the limit is reached.
    if (!(await verifyPassword(user.passwordHash, dto.password))) {
      await this.recordFailedLogin(user.id);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // 4. Right password, but the account (or its client company) may not sign in.
    const blocker = signInBlocker(user);
    if (blocker) throw new ForbiddenException(blocker);

    const signedIn = await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
      select: authUserSelect,
    });
    const session = await this.sessions.create(user.id, {
      ...meta,
      platform: dto.platform,
      deviceName: dto.deviceName,
    });
    return this.buildResponse(signedIn, session);
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    const session = await this.sessions.rotate(refreshToken);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: authUserSelect,
    });

    // The account may have been deactivated since login: end the session.
    if (signInBlocker(user)) {
      await this.sessions.revoke(session.sessionId, 'USER_DEACTIVATED');
      throw new UnauthorizedException('Session is no longer valid');
    }
    return this.buildResponse(user, session);
  }

  logout(current: JwtPayload): Promise<void> {
    return this.sessions.revoke(current.sid, 'LOGOUT');
  }

  logoutAll(current: JwtPayload): Promise<void> {
    return this.sessions.revokeAllForUser(current.sub, 'LOGOUT_ALL');
  }

  async me(current: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: current.sub },
      select: authUserSelect,
    });
    if (!user || user.deletedAt) throw new UnauthorizedException();
    return toAuthUser(user);
  }

  /** Changes the password, logs out every other session and returns fresh tokens for this one. */
  async changePassword(
    current: JwtPayload,
    dto: ChangePasswordDto,
    meta: SessionMeta,
  ): Promise<LoginResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: current.sub },
      select: { passwordHash: true },
    });
    if (!(await verifyPassword(user.passwordHash, dto.currentPassword))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('New password must differ from the current one');
    }

    const updated = await this.prisma.user.update({
      where: { id: current.sub },
      data: {
        passwordHash: await hashPassword(dto.newPassword),
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
      select: authUserSelect,
    });
    // Every session, including this one, is replaced by a new session.
    await this.sessions.revokeAllForUser(current.sub, 'PASSWORD_CHANGED');
    const session = await this.sessions.create(current.sub, meta);
    return this.buildResponse(updated, session);
  }

  private async recordFailedLogin(userId: string): Promise<void> {
    const { failedLoginAttempts } = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    if (failedLoginAttempts >= this.auth.maxFailedLogins) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: new Date(Date.now() + this.auth.lockoutMinutes * 60_000),
        },
      });
    }
  }

  private async buildResponse(
    user: AuthUserRow,
    session: { sessionId: string; refreshToken: string; expiresAt: Date },
  ): Promise<LoginResponse> {
    const profile = toAuthUser(user);
    const accessToken = await this.tokens.signAccessToken({
      sub: profile.id,
      role: profile.role,
      clientId: user.clientId,
      sid: session.sessionId,
      mcp: profile.mustChangePassword,
    });
    return {
      tokenType: 'Bearer',
      accessToken,
      expiresIn: this.tokens.accessTokenTtlSeconds,
      refreshToken: session.refreshToken,
      refreshTokenExpiresAt: session.expiresAt.toISOString(),
      user: profile,
    };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= hashPassword('timing-equalizer-not-a-real-password-1');
    return this.dummyHash;
  }
}
