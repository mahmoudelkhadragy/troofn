import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { CookieStorage } from '../storage/cookie-storage';

const REFRESH_TOKEN_COOKIE = 'tf.refreshToken';
/** Names used by earlier versions of the dashboard; removed so no old token lingers. */
const LEGACY_COOKIES = ['tf.accessToken', 'tf.role'];
const LEGACY_LOCAL_STORAGE_KEY = 'tf.refreshToken';

/**
 * The only place that knows where the refresh token lives: a cookie (see CookieStorage). The access
 * token is never stored: it stays in memory and is replaced by a refresh after a reload.
 *
 * A cookie the page can read is as exposed to injected scripts (XSS) as localStorage was. The
 * stronger option is an HttpOnly cookie set by the API; switching to it only changes this file.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private readonly cookies = inject(CookieStorage);
  private readonly document = inject(DOCUMENT);

  constructor() {
    for (const name of LEGACY_COOKIES) this.cookies.remove(name);
    // The previous version kept the token in localStorage: delete it so nothing stays there.
    try {
      this.document.defaultView?.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
    } catch {
      // Storage blocked: there is nothing to remove.
    }
  }

  getRefreshToken(): string | null {
    return this.cookies.get(REFRESH_TOKEN_COOKIE);
  }

  /** `expiresAt` is the refresh token's expiry from the API; the cookie is dropped at the same time. */
  setRefreshToken(token: string, expiresAt?: string | Date): void {
    const maxAgeSeconds = expiresAt
      ? (new Date(expiresAt).getTime() - Date.now()) / 1000
      : undefined;
    this.cookies.set(REFRESH_TOKEN_COOKIE, token, { maxAgeSeconds });
  }

  clear(): void {
    this.cookies.remove(REFRESH_TOKEN_COOKIE);
  }
}
