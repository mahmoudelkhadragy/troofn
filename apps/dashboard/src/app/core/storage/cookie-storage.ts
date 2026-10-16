import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

export interface CookieOptions {
  /** How long the browser keeps it. Without it the cookie lasts until the browser is closed. */
  maxAgeSeconds?: number;
}

/**
 * The only way the dashboard stores anything in the browser: as cookies. Nothing uses
 * localStorage or sessionStorage, so everything that is kept lives (and expires) here.
 *
 * Every cookie is `SameSite=Strict` (never sent along with a request that comes from another site)
 * and `Secure` when the page is served over https. They are not `HttpOnly`, because the page's own
 * script has to read them; only a cookie set by the API itself could be HttpOnly.
 */
@Injectable({ providedIn: 'root' })
export class CookieStorage {
  private readonly document = inject(DOCUMENT);

  get(name: string): string | null {
    const prefix = `${encodeURIComponent(name)}=`;
    const cookie = this.document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));
    if (!cookie) return null;
    try {
      return decodeURIComponent(cookie.slice(prefix.length));
    } catch {
      return null;
    }
  }

  set(name: string, value: string, options: CookieOptions = {}): void {
    const maxAge =
      options.maxAgeSeconds === undefined
        ? ''
        : `; Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`;
    this.write(`${encodeURIComponent(name)}=${encodeURIComponent(value)}${maxAge}`);
  }

  remove(name: string): void {
    this.write(`${encodeURIComponent(name)}=; Max-Age=0`);
  }

  private write(cookie: string): void {
    if (!this.document.defaultView) return;
    const secure = this.document.defaultView.location.protocol === 'https:' ? '; Secure' : '';
    this.document.cookie = `${cookie}; Path=/; SameSite=Strict${secure}`;
  }
}
