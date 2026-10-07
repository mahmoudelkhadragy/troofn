import type { Paginated } from '../interceptors/transform-response.interceptor.js';
import type { PaginationQueryDto } from '../dto/index.js';

/** Builds the { items, meta } shape that the response interceptor turns into { data, meta }. */
export function paginate<T>(items: T[], total: number, query: PaginationQueryDto): Paginated<T> {
  return {
    items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}
