import { TestBed } from '@angular/core/testing';
import { CookieStorage } from './cookie-storage';

describe('CookieStorage', () => {
  let cookies: CookieStorage;
  /** Every string the code assigns to document.cookie, so the attributes can be checked. */
  let writes: string[];

  beforeEach(() => {
    writes = [];
    const real = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!;
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => real.get!.call(document) as string,
      set: (value: string) => {
        writes.push(value);
        real.set!.call(document, value);
      },
    });
    cookies = TestBed.inject(CookieStorage);
  });

  afterEach(() => {
    cookies.remove('a');
    cookies.remove('b');
    // Remove the interception, so the real accessor is used again.
    delete (document as { cookie?: string }).cookie;
  });

  it('stores a value and reads it back', () => {
    cookies.set('a', 'hello');
    expect(cookies.get('a')).toBe('hello');
  });

  it('keeps values that contain separators and non-ASCII characters intact', () => {
    cookies.set('a', 'x=1; y=2 مرحبا');
    expect(cookies.get('a')).toBe('x=1; y=2 مرحبا');
  });

  it('tells apart cookies whose names share a prefix', () => {
    cookies.set('a', '1');
    cookies.set('ab', '2');
    expect(cookies.get('a')).toBe('1');
    cookies.remove('ab');
  });

  it('is null for a cookie that does not exist', () => {
    expect(cookies.get('missing')).toBeNull();
  });

  it('removes a cookie', () => {
    cookies.set('b', 'x');
    cookies.remove('b');
    expect(cookies.get('b')).toBeNull();
  });

  it('every cookie is SameSite=Strict for the whole site', () => {
    cookies.set('a', 'x');
    expect(writes.at(-1)).toContain('SameSite=Strict');
    expect(writes.at(-1)).toContain('Path=/');
  });

  it('is not Secure on http (the test page), but would be on https', () => {
    cookies.set('a', 'x');
    expect(writes.at(-1)).not.toContain('Secure');
  });

  it('lasts for the given time, and a time in the past removes it at once', () => {
    cookies.set('a', 'x', { maxAgeSeconds: 3600.9 });
    expect(writes.at(-1)).toContain('Max-Age=3600');
    expect(cookies.get('a')).toBe('x');

    cookies.set('a', 'x', { maxAgeSeconds: -50 });
    expect(writes.at(-1)).toContain('Max-Age=0');
    expect(cookies.get('a')).toBeNull();
  });

  it('is a session cookie (no Max-Age) when no time is given', () => {
    cookies.set('a', 'x');
    expect(writes.at(-1)).not.toContain('Max-Age');
  });
});
