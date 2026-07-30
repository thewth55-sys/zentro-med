import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const SESSION_KEY = "zentro_med_session";

export interface StoredSession {
  access_token: string;
  refresh_token: string;
}

/**
 * Explicit native-storage backup of the Supabase session — a
 * complement to (not a replacement for) the normal cookie-based
 * session the web app already uses via @supabase/ssr.
 *
 * Why this exists: the Android app is a WebView pointed at the live
 * site, so its session normally lives in the WebView's own cookie
 * jar. That's supposed to persist across app restarts (the auth
 * cookie's maxAge is ~400 days, not a browser-session cookie), but in
 * practice some Android OEMs (MIUI in particular) aggressively clear
 * WebView data when an app is fully closed/swiped away, regardless of
 * cookie attributes. @capacitor/preferences is backed by Android's
 * SharedPreferences (native app-private storage) — a different,
 * more durable persistence layer the OS doesn't casually clear the
 * same way, so restoring from here works even when the WebView's own
 * cookies didn't survive.
 */
export async function saveNativeSession(session: StoredSession): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await Preferences.set({ key: SESSION_KEY, value: JSON.stringify(session) });
}

export async function loadNativeSession(): Promise<StoredSession | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const { value } = await Preferences.get({ key: SESSION_KEY });
  if (!value) return null;
  try {
    return JSON.parse(value) as StoredSession;
  } catch {
    return null;
  }
}

export async function clearNativeSession(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await Preferences.remove({ key: SESSION_KEY });
}
