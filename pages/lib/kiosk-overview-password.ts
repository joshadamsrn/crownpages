import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const PASSWORD_HASH_PREFIX = "scrypt-v1";
const PASSWORD_KEY_LENGTH = 64;

export function hashKioskOverviewPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");

  return `${PASSWORD_HASH_PREFIX}:${salt}:${hash}`;
}

export function verifyKioskOverviewPassword(password: string, storedHash: string | null | undefined) {
  if (!password || !storedHash) {
    return false;
  }

  const [prefix, salt, hash] = storedHash.split(":");
  if (prefix !== PASSWORD_HASH_PREFIX || !salt || !hash) {
    return false;
  }

  const candidate = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
