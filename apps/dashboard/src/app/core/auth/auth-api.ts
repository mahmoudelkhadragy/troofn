import { HttpClient, HttpContext, HttpContextToken, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiResponse, LoginResponse } from '@troofn/shared';
import { environment } from '@env/environment';
import { map, Observable } from 'rxjs';
import type { LoginRequest } from './auth.model';

/**
 * Marks a request to one of the /auth endpoints. authInterceptor leaves these alone:
 * it neither attaches the stored token nor tries a refresh when they answer 401.
 */
export const AUTH_ENDPOINT = new HttpContextToken<boolean>(() => false);

const context = () => new HttpContext().set(AUTH_ENDPOINT, true);

/** HTTP calls to /auth only. It keeps no state; AuthService decides what to do with the answers. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auth`;

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.url}/login`, body, { context: context() })
      .pipe(map((res) => res.data));
  }

  refresh(refreshToken: string): Observable<LoginResponse> {
    return this.http
      .post<ApiResponse<LoginResponse>>(
        `${this.url}/refresh`,
        { refreshToken },
        { context: context() },
      )
      .pipe(map((res) => res.data));
  }

  /** Takes the token explicitly: the session is already cleared locally when this is sent. */
  logout(accessToken: string): Observable<void> {
    return this.http.post<void>(
      `${this.url}/logout`,
      {},
      {
        context: context(),
        headers: new HttpHeaders({ Authorization: `Bearer ${accessToken}` }),
      },
    );
  }
}
