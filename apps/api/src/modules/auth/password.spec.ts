import { hashPassword, isStrongPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('hashes with argon2id and never returns the plain text', async () => {
    const hash = await hashPassword('Secret123');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('Secret123');
  });

  it('produces a different hash each time (random salt)', async () => {
    expect(await hashPassword('Secret123')).not.toBe(await hashPassword('Secret123'));
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('Secret123');
    expect(await verifyPassword(hash, 'Secret123')).toBe(true);
    expect(await verifyPassword(hash, 'secret123')).toBe(false);
  });

  it('returns false (does not throw) for a malformed hash', async () => {
    expect(await verifyPassword('not-a-hash', 'Secret123')).toBe(false);
  });

  it.each([
    ['WejnadSa1', true],
    ['abcdefg1', true],
    ['short1A', false], // 7 characters
    ['allletters', false], // no digit
    ['12345678', false], // no letter
  ])('policy: %s → %s', (password, expected) => {
    expect(isStrongPassword(password)).toBe(expected);
  });
});
