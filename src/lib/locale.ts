/**
 * Single source of truth for the supported UI locales.
 *
 * Companion to `src/i18n/request.ts` (resolves which `messages/*.json`
 * to load) and the language picker in Settings → Apariencia
 * (`src/components/settings/appearance-panel.tsx`). Adding a locale
 * needs: an entry here, a `messages/<id>.json` translation file, and
 * nothing else — no routing changes.
 */

export const LOCALES = ["en", "es"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
