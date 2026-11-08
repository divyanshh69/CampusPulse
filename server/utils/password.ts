import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt with salt rounds = 10.
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * Compares a plaintext candidate password against a stored bcrypt hash.
 */
export async function comparePassword(
  plainText: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

