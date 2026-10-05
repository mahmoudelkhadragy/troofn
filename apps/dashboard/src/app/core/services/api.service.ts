import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import type { ApiResponse, PaginationMeta, PaginationQuery } from '@troofn/shared';
import { map, Observable } from 'rxjs';

export interface Page<T> {
  items: T[];
  meta: PaginationMeta;
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

/**
 * Thin typed wrapper over HttpClient. It prefixes the API base URL and
 * unwraps the { success, data, meta } envelope. Feature services use this.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get<T>(path: string, params?: QueryParams, context?: HttpContext): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(this.url(path), { params: toParams(params), context })
      .pipe(map((res) => res.data));
  }

  getPage<T>(path: string, query?: PaginationQuery & QueryParams): Observable<Page<T>> {
    return this.http
      .get<ApiResponse<T[]>>(this.url(path), { params: toParams(query) })
      .pipe(map((res) => ({ items: res.data, meta: res.meta! })));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(this.url(path), body).pipe(map((res) => res.data));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(this.url(path), body).pipe(map((res) => res.data));
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<ApiResponse<T>>(this.url(path), body).pipe(map((res) => res.data));
  }

  delete<T = void>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(this.url(path)).pipe(map((res) => res.data));
  }

  private url(path: string): string {
    return `${this.baseUrl}/${path.replace(/^\//, '')}`;
  }
}

function toParams(params?: QueryParams): HttpParams {
  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      httpParams = httpParams.set(key, String(value));
    }
  }
  return httpParams;
}
