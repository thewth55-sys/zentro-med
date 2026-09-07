// Minimal mimetype<->extension mapping — enough for what WhatsApp
// actually sends/accepts, no need to pull in a full `mime-types`
// dependency for this. Used only for naming stored objects; the actual
// Content-Type served back to the browser always comes from what we
// pass as `contentType` at upload time (the real mimetype Baileys gave
// us), not from a reverse lookup off the extension.

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/3gpp': '3gp',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/amr': 'amr',
  'application/pdf': 'pdf',
};

/** Baileys reports audio mimetypes with a codec suffix sometimes, e.g.
 *  "audio/ogg; codecs=opus" — strip that before the lookup. */
export function extensionForMimetype(mimetype: string | null | undefined): string {
  if (!mimetype) return 'bin';
  const base = mimetype.split(';')[0].trim().toLowerCase();
  return MIME_TO_EXT[base] ?? 'bin';
}

/** The Baileys message-content key (from getContentType()) mapped to
 *  this app's `messages.content_type` values — mirrors how the Meta
 *  webhook treats stickers as images (see webhook/route.ts's
 *  processMessage comment: "stickers are images"). */
export type InboundMediaKind = 'image' | 'video' | 'audio' | 'document';

const CONTENT_TYPE_TO_KIND: Record<string, InboundMediaKind> = {
  imageMessage: 'image',
  stickerMessage: 'image',
  videoMessage: 'video',
  audioMessage: 'audio',
  documentMessage: 'document',
};

export function mediaKindForContentType(contentType: string | undefined): InboundMediaKind | null {
  if (!contentType) return null;
  return CONTENT_TYPE_TO_KIND[contentType] ?? null;
}
