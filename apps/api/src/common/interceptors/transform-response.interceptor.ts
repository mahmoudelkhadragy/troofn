import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { ApiResponse, PaginationMeta } from '@troofn/shared';
import { map, Observable } from 'rxjs';

/** Shape a service can return to include pagination metadata. */
export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

function isPaginated(value: unknown): value is Paginated<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as Paginated<unknown>).items) &&
    typeof (value as Paginated<unknown>).meta === 'object'
  );
}

/** Wraps every successful response in the standard ApiResponse envelope. */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<unknown>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<unknown>> {
    return next
      .handle()
      .pipe(
        map((data) =>
          isPaginated(data)
            ? { success: true as const, data: data.items, meta: data.meta }
            : { success: true as const, data },
        ),
      );
  }
}
