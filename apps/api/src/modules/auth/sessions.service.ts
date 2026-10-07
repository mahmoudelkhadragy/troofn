import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { SessionPlatform } from '@troofn/shared';
import { PrismaService } from '../../database/index.js';
import type { SessionRevokeReason } from '../../generated/prisma/enums.js';
import { TokenService } from './token.service.js';

export interface SessionMeta {
  platform?: SessionPlatform;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
}

const INVALID_REFRESH = 'Invalid or expired refresh token';

/**
 * One row in user_sessions per login. The refresh token secret rotates inside the
 * row on every refresh; presenting an already-rotated secret means the token was
 * copied, so the whole session is revoked.
 */
@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async create(
    userId: string,
    meta: SessionMeta,
  ): Promise<{ sessionId: string; refreshToken: string; expiresAt: Date }> {
    const expiresAt = this.tokens.refreshTokenExpiry();
    // The id is part of the token, so create the row first, then store the token's hash.
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.userSession.create({
        data: {
          userId,
          refreshTokenHash: 'pending',
          platform: meta.platform ?? 'UNKNOWN',
          deviceName: meta.deviceName,
          userAgent: meta.userAgent?.slice(0, 500),
          ipAddress: meta.ipAddress?.slice(0, 45),
          expiresAt,
        },
        select: { id: true },
      });
      const { token, hash } = this.tokens.issueRefreshToken(session.id);
      await tx.userSession.update({ where: { id: session.id }, data: { refreshTokenHash: hash } });
      return { sessionId: session.id, refreshToken: token, expiresAt };
    });
  }

  /** Validates a refresh token and replaces it. Returns the session's user id. */
  async rotate(
    refreshToken: string,
  ): Promise<{ userId: string; sessionId: string; refreshToken: string; expiresAt: Date }> {
    const parsed = this.tokens.parseRefreshToken(refreshToken);
    if (!parsed) throw new UnauthorizedException(INVALID_REFRESH);

    const session = await this.prisma.userSession.findUnique({ where: { id: parsed.sessionId } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }

    if (!this.tokens.refreshSecretMatches(parsed.secret, session.refreshTokenHash)) {
      await this.revoke(session.id, 'TOKEN_REUSE');
      throw new UnauthorizedException(INVALID_REFRESH);
    }

    const { token, hash } = this.tokens.issueRefreshToken(session.id);
    const expiresAt = this.tokens.refreshTokenExpiry();
    // Compare-and-swap on the old hash: if two refreshes race, only one wins.
    const { count } = await this.prisma.userSession.updateMany({
      where: { id: session.id, refreshTokenHash: session.refreshTokenHash, revokedAt: null },
      data: { refreshTokenHash: hash, lastUsedAt: new Date(), expiresAt },
    });
    if (count !== 1) throw new UnauthorizedException(INVALID_REFRESH);

    return { userId: session.userId, sessionId: session.id, refreshToken: token, expiresAt };
  }

  async revoke(sessionId: string, reason: SessionRevokeReason): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  async revokeAllForUser(
    userId: string,
    reason: SessionRevokeReason,
    exceptSessionId?: string,
  ): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null, ...(exceptSessionId && { id: { not: exceptSessionId } }) },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }
}
