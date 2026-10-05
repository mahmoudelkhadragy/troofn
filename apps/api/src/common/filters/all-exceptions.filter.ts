import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiError } from '@troofn/shared';
import type { Request, Response } from 'express';

/** Converts every thrown error into the standard ApiError envelope. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let details: unknown;
    if (isHttp) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        // Nest bodies look like { statusCode, message, error: 'Not Found' }.
        // Anything beyond that (e.g. health-check results) is kept as details.
        const {
          message: bodyMessage,
          statusCode: _statusCode,
          error,
          ...extra
        } = body as Record<string, unknown>;
        if (typeof error === 'object' && error !== null) extra.error = error;

        if (Array.isArray(bodyMessage)) {
          message = 'Validation failed';
          details = bodyMessage;
        } else {
          message = typeof bodyMessage === 'string' ? bodyMessage : exception.message;
          details = Object.keys(extra).length ? extra : undefined;
        }
      }
    } else {
      this.logger.error(exception);
    }

    const payload: ApiError = {
      success: false,
      error: {
        statusCode,
        message,
        details,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    };
    response.status(statusCode).json(payload);
  }
}
