import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtPayload } from '@troofn/shared';
import {
  ALLOW_PENDING_PASSWORD_CHANGE_KEY,
  IS_PUBLIC_KEY,
} from '../../../common/decorators/index.js';
import { TokenService } from '../token.service.js';

interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: JwtPayload;
}

/**
 * Global guard: every route needs a valid Bearer access token unless it is @Public().
 * It only checks the token's signature and expiry (no database query), then puts the
 * claims on `request.user` for the guards and handlers that follow.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);
    if (!token) throw new UnauthorizedException('Missing access token');

    const user = await this.tokens.verifyAccessToken(token);

    const allowsPendingChange = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PENDING_PASSWORD_CHANGE_KEY,
      targets,
    );
    if (user.mcp && !allowsPendingChange) {
      throw new ForbiddenException('Password change required');
    }

    request.user = user;
    return true;
  }

  private extractBearerToken(request: AuthenticatedRequest): string | null {
    const header = request.headers.authorization;
    if (typeof header !== 'string') return null;
    const [scheme, token] = header.split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }
}
