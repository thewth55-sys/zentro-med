import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidGroup,
  isJidBroadcast,
  isJidStatusBroadcast,
  jidNormalizedUser,
  type WASocket,
  type WAMessage,
} from 'baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import { loadSupabaseAuthState } from './auth-state.js';
import { supabaseAdmin } from './supabase.js';
import { notifyInboundMessage } from './webhook-client.js';

// One entry per account with an active (or connecting) socket. Accounts
// with no entry here are simply disconnected — the row in
// whatsapp_config.qr_connection_state is the durable source of truth;
// this map is just which sockets are live IN THIS PROCESS right now.
const sessions = new Map<string, WASocket>();

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

// QR codes expire ~60s in practice; give a little slack for clock skew
// between this process and whatever reads qr_code_expires_at.
const QR_EXPIRY_MS = 60_000;

function toWhatsAppJid(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  return `${digits}@s.whatsapp.net`;
}

async function updateConfigRow(accountId: string, fields: Record<string, unknown>): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('whatsapp_config')
    .update(fields)
    .eq('account_id', accountId)
    .eq('provider', 'qr');
  if (error) {
    logger.error({ accountId, error: error.message }, 'failed to update whatsapp_config row');
  }
}

async function configRowExists(accountId: string): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('id')
    .eq('account_id', accountId)
    .eq('provider', 'qr')
    .maybeSingle();
  return !!data;
}

export function isSessionActive(accountId: string): boolean {
  return sessions.has(accountId);
}

/** Starts (or restarts) a Baileys session for an account. Requires a
 *  `whatsapp_config` row with provider='qr' to already exist — that row
 *  is created by the monolith's qr/accept-risk endpoint, which is where
 *  the mandatory risk acknowledgment is recorded (see migration 115's
 *  qr_risk_accepted_at CHECK). This function never creates that row
 *  itself, so a connect attempt for an account that never accepted the
 *  risk disclosure fails loudly instead of silently starting a session
 *  nothing consented to. */
export async function connectSession(accountId: string): Promise<void> {
  const existingSocket = sessions.get(accountId);
  if (existingSocket) {
    // Already connecting/connected — treat as a no-op rather than
    // stacking a second socket for the same account.
    return;
  }

  if (!(await configRowExists(accountId))) {
    throw new Error(`No qr whatsapp_config row for account ${accountId} — accept the risk disclosure first`);
  }

  const { state, saveCreds } = await loadSupabaseAuthState(accountId, logger);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    logger,
    version,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sessions.set(accountId, sock);
  await updateConfigRow(accountId, { qr_connection_state: 'awaiting_scan' });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    void handleConnectionUpdate(accountId, sock, update);
  });

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      void handleInboundMessage(accountId, msg);
    }
  });
}

async function handleConnectionUpdate(
  accountId: string,
  sock: WASocket,
  update: Partial<{
    connection: 'open' | 'connecting' | 'close';
    lastDisconnect?: { error: Error | undefined; date: Date };
    qr?: string;
  }>
): Promise<void> {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    try {
      const qrDataUrl = await QRCode.toDataURL(qr);
      await updateConfigRow(accountId, {
        qr_current_code: qrDataUrl,
        qr_code_expires_at: new Date(Date.now() + QR_EXPIRY_MS).toISOString(),
        qr_connection_state: 'awaiting_scan',
      });
    } catch (err) {
      logger.error({ accountId, err }, 'failed to render/persist QR code');
    }
  }

  if (connection === 'open') {
    const connectedPhone = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
    await updateConfigRow(accountId, {
      qr_connection_state: 'connected',
      qr_current_code: null,
      qr_code_expires_at: null,
      qr_connected_phone: connectedPhone,
      qr_last_disconnect_reason: null,
    });
    logger.info({ accountId, connectedPhone }, 'qr session connected');
  }

  if (connection === 'close') {
    sessions.delete(accountId);
    const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
    const reason = lastDisconnect?.error?.message ?? `status ${statusCode ?? 'unknown'}`;

    if (statusCode === DisconnectReason.loggedOut) {
      await updateConfigRow(accountId, {
        qr_connection_state: 'logged_out',
        qr_current_code: null,
        qr_code_expires_at: null,
        qr_auth_state: null,
        qr_last_disconnect_reason: reason,
      });
      logger.info({ accountId }, 'qr session logged out — not reconnecting');
      return;
    }

    await updateConfigRow(accountId, {
      qr_connection_state: 'disconnected',
      qr_last_disconnect_reason: reason,
    });
    logger.warn({ accountId, reason }, 'qr session dropped — reconnecting');
    // Any other close (connectionClosed, connectionLost, restartRequired,
    // timedOut, etc.) is transient from Baileys' own perspective — same
    // policy Baileys' own docs recommend: reconnect unless logged out.
    void connectSession(accountId).catch((err) =>
      logger.error({ accountId, err }, 'reconnect attempt failed')
    );
  }
}

async function handleInboundMessage(accountId: string, msg: WAMessage): Promise<void> {
  if (msg.key.fromMe) return;
  const remoteJid = msg.key.remoteJid;
  if (!remoteJid || isJidGroup(remoteJid) || isJidBroadcast(remoteJid) || isJidStatusBroadcast(remoteJid)) {
    // Phase 1 is 1:1 text only — group/broadcast/status messages are
    // silently ignored rather than misfiled into a contact's DM thread.
    return;
  }

  const text =
    msg.message?.conversation ??
    msg.message?.extendedTextMessage?.text ??
    null;
  if (!text) {
    // Phase 1 doesn't ingest media/interactive replies over QR — see
    // provider-dispatch.ts's Phase 1 scope note.
    return;
  }

  await notifyInboundMessage({
    accountId,
    whatsappSessionId: remoteJid,
    externalMessageId: msg.key.id ?? '',
    senderPhone: jidNormalizedUser(remoteJid).replace('@s.whatsapp.net', ''),
    contactName: msg.pushName ?? undefined,
    contentText: text,
    timestamp: typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp * 1000 : Date.now(),
  });
}

export async function sendText(accountId: string, to: string, text: string): Promise<{ messageId: string }> {
  const sock = sessions.get(accountId);
  if (!sock) {
    throw new Error(`No active qr session for account ${accountId}`);
  }
  const jid = toWhatsAppJid(to);
  const result = await sock.sendMessage(jid, { text });
  if (!result?.key.id) {
    throw new Error('wa-qr-gateway: sendMessage returned no message id');
  }
  return { messageId: result.key.id };
}

export async function disconnectSession(accountId: string): Promise<void> {
  const sock = sessions.get(accountId);
  sessions.delete(accountId);
  if (sock) {
    try {
      await sock.logout();
    } catch (err) {
      logger.warn({ accountId, err }, 'logout() threw — clearing local state anyway');
    }
  }
  await updateConfigRow(accountId, {
    qr_connection_state: 'logged_out',
    qr_current_code: null,
    qr_code_expires_at: null,
    qr_auth_state: null,
    qr_connected_phone: null,
  });
}

/** Called once at process boot. Sessions that were connected (or
 *  mid-pairing) when the container last stopped won't resume on their
 *  own — Baileys only reconnects sockets that exist in THIS process's
 *  memory. Without this, any redeploy or crash silently drops every
 *  client's QR line until someone notices and reconnects manually. */
export async function restoreSessionsOnBoot(): Promise<void> {
  const { data, error } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('account_id')
    .eq('provider', 'qr')
    .in('qr_connection_state', ['connected', 'awaiting_scan']);

  if (error) {
    logger.error({ error: error.message }, 'failed to list sessions to restore on boot');
    return;
  }

  for (const row of data ?? []) {
    const accountId = (row as { account_id: string }).account_id;
    logger.info({ accountId }, 'restoring qr session on boot');
    await connectSession(accountId).catch((err) =>
      logger.error({ accountId, err }, 'failed to restore session on boot')
    );
  }
}
