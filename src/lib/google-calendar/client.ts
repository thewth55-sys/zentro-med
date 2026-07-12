// ============================================================
// Google Calendar — plain fetch REST client, no `googleapis` SDK.
// Mirrors the style of lib/whatsapp/meta-api.ts (single fetch per
// call, throws on non-2xx) rather than pulling in Google's official
// Node client, which drags in most of their API surface for the ~6
// endpoints (auth code exchange, token refresh, events.insert/patch/
// delete) this integration actually needs.
//
// One-way sync only (Zentro Med → Google Calendar) — Phase C per the
// scheduling module's original design (037_clinic_scheduling_core.sql).
// Each doctor connects THEIR OWN calendar; there is no read-back path,
// so an edit made directly in Google never flows back into Zentro Med.
// ============================================================

const OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

// `calendar.events` (not the broader `calendar`) — create/read/update/
// delete events only, no access to calendar settings or the ability
// to list/modify OTHER calendars the doctor owns.
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function redirectUri(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://med.zentrolabs.com";
  return `${siteUrl}/api/google-calendar/callback`;
}

/**
 * Builds the consent-screen URL. `state` carries the doctor id so the
 * callback can resolve which doctor row to attach the tokens to
 * without relying on session state surviving the round-trip to
 * Google and back (it does, via cookies, but state is the documented
 * OAuth mechanism for this and survives even if a cookie doesn't).
 */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline", // required to receive a refresh_token
    prompt: "consent", // forces refresh_token on every connect, not just the first
    state,
  });
  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getEnv("GOOGLE_CLIENT_ID"),
      client_secret: getEnv("GOOGLE_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${data.error_description || data.error || res.status}`);
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getEnv("GOOGLE_CLIENT_ID"),
      client_secret: getEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${data.error_description || data.error || res.status}`);
  }
  return data.access_token;
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  location?: string;
  startAt: string; // ISO
  endAt: string; // ISO
}

export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: CalendarEventInput,
): Promise<string> {
  const res = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: { dateTime: event.startAt },
        end: { dateTime: event.endAt },
      }),
    },
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Google Calendar event create failed: ${data.error?.message || res.status}`);
  }
  return data.id;
}

export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: CalendarEventInput,
): Promise<void> {
  const res = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: { dateTime: event.startAt },
        end: { dateTime: event.endAt },
      }),
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Google Calendar event update failed: ${data.error?.message || res.status}`);
  }
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  // 410 Gone = already deleted on Google's side (e.g. the doctor
  // deleted it themselves) — treat as success, nothing left to do.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Google Calendar event delete failed: ${data.error?.message || res.status}`);
  }
}
