/** Standard success envelope returned by every API endpoint. */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/** Standard error envelope returned by the global exception filter. */
export interface ApiError {
  success: false;
  error: {
    statusCode: number;
    message: string;
    details?: unknown;
    path: string;
    timestamp: string;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
