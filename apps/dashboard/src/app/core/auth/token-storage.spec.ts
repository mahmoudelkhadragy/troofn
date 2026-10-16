import { TestBed } from '@angular/core/testing';
import { CookieStorage } from '../storage/cookie-storage';
import { TokenStorage } from './token-storage';

describe('TokenStorage', () => {
  const cookies = () => TestBed.inject(CookieStorage);
  const hours = (n: number) => new Date(Date.now() + n * 3600 * 1000);

  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'tf.refreshToken=; Path=/; Max-Age=0';
  });

  it('keeps the refresh token in a cookie, not in localStorage', () => {
    const storage = TestBed.inject(TokenStorage);
    storage.setRefreshToken('r1');
    expect(storage.getRefreshToken()).toBe('r1');
    expect(cookies().get('tf.refreshToken')).toBe('r1');
    expect(localStorage.length).toBe(0);
  });

  it('clears it', () => {
    const storage = TestBed.inject(TokenStorage);
    storage.setRefreshToken('r1');
    storage.clear();
    expect(storage.getRefreshToken()).toBeNull();
  });

  it('drops the cookie when the refresh token expires', () => {
    const storage = TestBed.inject(TokenStorage);
    storage.setRefreshToken('r1', hours(2));
    expect(storage.getRefreshToken()).toBe('r1');

    storage.setRefreshToken('r2', hours(-1)); // already expired
    expect(storage.getRefreshToken()).toBeNull();
  });

  it('accepts the expiry as the API sends it (an ISO string)', () => {
    const storage = TestBed.inject(TokenStorage);
    storage.setRefreshToken('r1', hours(2).toISOString());
    expect(storage.getRefreshToken()).toBe('r1');
  });

  it('on start, deletes the token an earlier version left in localStorage, and the old cookies', () => {
    localStorage.setItem('tf.refreshToken', 'stale');
    document.cookie = 'tf.accessToken=old; Path=/';
    document.cookie = 'tf.role=admin; Path=/';

    TestBed.inject(TokenStorage);

    expect(localStorage.getItem('tf.refreshToken')).toBeNull();
    expect(cookies().get('tf.accessToken')).toBeNull();
    expect(cookies().get('tf.role')).toBeNull();
  });

  it('keeps a refresh token that is already in the cookie when the app starts', () => {
    cookies().set('tf.refreshToken', 'kept');
    expect(TestBed.inject(TokenStorage).getRefreshToken()).toBe('kept');
  });
});
