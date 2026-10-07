import argon2 from 'argon2';

/**
 * Password hashing with argon2id (the OWASP-recommended algorithm). Each hash
 * embeds its own random salt and parameters, so only the hash string is stored.
 * Plain functions (no Nest DI) so the seed script can use them too.
 */

/** At least 8 characters, with at least one letter and one digit. */
export const PASSWORD_POLICY = /^(?=.*\p{L})(?=.*\d).{8,}$/u;
export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and contain a letter and a digit';

export function isStrongPassword(password: string): boolean {
  return PASSWORD_POLICY.test(password);
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

/** Never throws: a malformed hash simply does not match. */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
