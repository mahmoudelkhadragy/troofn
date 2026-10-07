import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionsService } from './sessions.service.js';
import { TokenService } from './token.service.js';

@Module({
  // Secrets and lifetimes are passed per call by TokenService (from typed config).
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, SessionsService, TokenService],
  exports: [TokenService, SessionsService],
})
export class AuthModule {}
