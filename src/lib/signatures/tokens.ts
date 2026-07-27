// ============================================================
// Signing-link + OTP token utilities — pure, server-side, no
// Supabase. Mirrors src/lib/auth/invitations.ts: the DB stores only
// hashes (SHA-256), plaintext token/code exist just long enough to
// put in a URL / send in an email.
// ============================================================

import { createHash, randomBytes, randomInt } from "node:crypto";

/** How long a signing link stays open before the patient must be re-sent one. */
export const SIGNATURE_LINK_EXPIRY_DAYS = 7;

/** How long a single OTP code is valid for. */
export const OTP_EXPIRY_MINUTES = 10;

export interface GeneratedToken {
  /** Plaintext — goes in the URL, never persisted. */
  token: string;
  /** SHA-256 hex digest — persist this in signature_requests.token_hash. */
  hash: string;
}

export function generateSignatureToken(): GeneratedToken {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashSignatureToken(token) };
}

export function hashSignatureToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Builds the public signing URL shared by email. `baseUrl` must NOT have a trailing slash. */
export function signatureUrl(token: string, baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return `${trimmed}/firmar/${token}`;
}

export function signatureRequestExpiry(days = SIGNATURE_LINK_EXPIRY_DAYS): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/** 6-digit numeric code — randomInt is CSPRNG-backed, unlike Math.random(). */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function otpExpiry(minutes = OTP_EXPIRY_MINUTES): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/** "juana@example.com" -> "ju***@example.com" for display before OTP verification. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}
