import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

// Lazy, shared Firebase Admin app — mirrors supabaseAdmin()'s pattern
// (billing-platform/admin-client.ts). The service account credentials
// live in FIREBASE_SERVICE_ACCOUNT_JSON as a single stringified JSON
// blob (the whole file Firebase Console gives you when you generate a
// new private key) — the usual way to carry a multi-line credentials
// file through an env var on Vercel/serverless hosts that don't let
// you mount a file.
let _app: App | null = null;

/**
 * Returns null (not a thrown error) when Firebase isn't configured
 * yet — every call site is on a path (WhatsApp webhook, conversation
 * assignment) that must keep working before the Android app and its
 * Firebase project exist. Push notifications are additive, never a
 * hard dependency of the rest of the product.
 */
export function getFirebaseMessaging(): Messaging | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    if (!_app) {
      const existing = getApps()[0];
      _app = existing ?? initializeApp({ credential: cert(JSON.parse(raw)) });
    }
    return getMessaging(_app);
  } catch (err) {
    console.error("[firebase-admin] failed to initialize:", err);
    return null;
  }
}
