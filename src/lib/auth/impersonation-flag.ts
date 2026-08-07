/**
 * sessionStorage key stamped by account-actions-menu.tsx right before
 * the post-"Impersonar" redirect, and read+cleared by use-auth.tsx's
 * SIGNED_IN handler to tell POST /api/auth/log-session this login
 * event is an admin impersonation, not the customer's own — see
 * 087_login_events_impersonation_flag.sql for why that distinction
 * matters. Shared as a constant (not inlined in both files) so the
 * two sides can never drift out of sync on the literal string.
 */
export const IMPERSONATION_SESSION_FLAG = "zentro-impersonation-session";
