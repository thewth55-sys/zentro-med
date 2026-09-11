// ============================================================
// Server-only Zoho Desk REST API client — backs the in-app "Centro
// de ayuda" ticket form/list. Uses a Self Client OAuth app (server-
// to-server, no per-user Zoho login) whose refresh token never
// expires unless revoked in the Zoho API Console.
//
// Confirmed against the real API (not guessed from docs, which are
// incomplete/inconsistent on several of these points):
//   - POST /contacts does NOT dedupe by email — calling it twice for
//     the same person creates two separate contacts. There is no
//     find-by-email without the extra Desk.search.READ scope, so
//     callers must store the returned contact id themselves (see
//     migration 124's profiles.zoho_desk_contact_id) and never call
//     createContact twice for the same person.
//   - POST /tickets requires `subject` + `departmentId` +
//     `contactId` (a bare `email` field is NOT accepted in place of
//     contactId, despite some third-party write-ups claiming
//     otherwise).
//   - GET /tickets does not accept `contactId`/`email` as filters;
//     the dedicated GET /tickets/search?contactId=... endpoint does,
//     but needs the separate Desk.search.READ scope.
// ============================================================

const API_BASE = "https://desk.zoho.com/api/v1";
const TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token";

export interface ZohoDeskTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  createdTime: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.token;
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_DESK_CLIENT_ID!,
      client_secret: process.env.ZOHO_DESK_CLIENT_SECRET!,
      refresh_token: process.env.ZOHO_DESK_REFRESH_TOKEN!,
    }),
  });
  if (!res.ok) throw new Error(`Zoho Desk token refresh failed (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  // Refresh a minute early so a near-expiry token is never handed to
  // a caller that then hits an in-flight 401 mid-request.
  cachedAccessToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedAccessToken.token;
}

async function zohoDeskFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Zoho-oauthtoken ${token}`,
      orgId: process.env.ZOHO_DESK_ORG_ID!,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Zoho Desk API ${path} failed (${res.status}): ${detail}`);
  }
  return res.json();
}

/** Creates a brand-new Zoho Desk contact — callers MUST have already
 *  checked there's no stored contact id for this person first (see
 *  the file-level comment on why: no safe dedupe-by-email available). */
export async function createContact(name: string, email: string): Promise<string> {
  const data = (await zohoDeskFetch("/contacts", {
    method: "POST",
    body: JSON.stringify({ lastName: name || email, email }),
  })) as { id: string };
  return data.id;
}

export async function createTicket(args: {
  contactId: string;
  subject: string;
  description: string;
}): Promise<ZohoDeskTicket> {
  const data = (await zohoDeskFetch("/tickets", {
    method: "POST",
    body: JSON.stringify({
      subject: args.subject,
      description: args.description,
      contactId: args.contactId,
      departmentId: process.env.ZOHO_DESK_DEPARTMENT_ID!,
    }),
  })) as ZohoDeskTicket;
  return data;
}

export async function listTicketsForContact(contactId: string): Promise<ZohoDeskTicket[]> {
  const data = (await zohoDeskFetch(`/tickets/search?contactId=${encodeURIComponent(contactId)}`)) as {
    data: ZohoDeskTicket[];
  };
  return data.data ?? [];
}
