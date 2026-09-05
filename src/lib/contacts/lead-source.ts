/**
 * `contacts.lead_source` is free text in the DB (no CHECK constraint —
 * see contact-detail-view.tsx's edit `<select>`), but the UI only ever
 * writes one of these known buckets. Anything else (a value typed
 * directly into the DB, or from an older/external import) is shown
 * verbatim rather than mistranslated.
 */
const KNOWN_LEAD_SOURCES = [
  "google",
  "social_media",
  "referral",
  "whatsapp",
  "website",
  "advertising",
  "other",
] as const;

type KnownLeadSource = (typeof KNOWN_LEAD_SOURCES)[number];

/** Maps the DB's snake_case values to the (historically camelCase)
 *  message keys under `Contacts.detailView.leadSources` — kept as an
 *  explicit table instead of a case transform so the two can diverge
 *  safely if either side changes independently. */
const MESSAGE_KEY_BY_SOURCE: Record<KnownLeadSource, string> = {
  google: "google",
  social_media: "socialMedia",
  referral: "referral",
  whatsapp: "whatsapp",
  website: "website",
  advertising: "advertising",
  other: "other",
};

function isKnownLeadSource(value: string): value is KnownLeadSource {
  return (KNOWN_LEAD_SOURCES as readonly string[]).includes(value);
}

/**
 * Translates a `contacts.lead_source` value via a translator already
 * scoped to (or including) `Contacts.detailView` — e.g.
 * `useTranslations("Contacts.detailView")`. Returns `null` for an
 * empty/missing value so callers can decide whether to render
 * anything at all, rather than showing an empty string.
 */
export function leadSourceLabel(
  value: string | null | undefined,
  t: (key: string) => string,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!isKnownLeadSource(trimmed)) return trimmed;
  return t(`leadSources.${MESSAGE_KEY_BY_SOURCE[trimmed]}`);
}
