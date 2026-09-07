"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// Curated to the Spanish-speaking markets this app actually serves
// today, plus the US (common for cross-border patients). Extend this
// list rather than hard-coding a country elsewhere if a clinic outside
// it signs up.
const COUNTRY_CALLING_CODES = [
  { iso: "MX", code: "52", flag: "🇲🇽", name: "México" },
  { iso: "US", code: "1", flag: "🇺🇸", name: "Estados Unidos" },
  { iso: "ES", code: "34", flag: "🇪🇸", name: "España" },
  { iso: "CO", code: "57", flag: "🇨🇴", name: "Colombia" },
  { iso: "AR", code: "54", flag: "🇦🇷", name: "Argentina" },
  { iso: "CL", code: "56", flag: "🇨🇱", name: "Chile" },
  { iso: "PE", code: "51", flag: "🇵🇪", name: "Perú" },
  { iso: "GT", code: "502", flag: "🇬🇹", name: "Guatemala" },
] as const

const DEFAULT_COUNTRY_ISO = "MX"

/**
 * Best-effort split of an already-stored phone (plain digits, no `+`
 * — see sanitizePhoneForMeta) into {country, local number}, for
 * pre-filling this input when editing an existing contact. Checked
 * longest-calling-code-first so a 3-digit code (Guatemala "502") isn't
 * shadowed by a coincidental match on a shorter one.
 *
 * A remainder under 7 digits is treated as "no real country code here"
 * rather than a real match — that's the legacy-bug shape this
 * component exists to stop producing (a bare local number with
 * nothing in front of it), not a valid short international number.
 */
function splitStoredPhone(stored: string): { countryIso: string; local: string } {
  const digits = stored.replace(/\D/g, "")
  if (!digits) return { countryIso: DEFAULT_COUNTRY_ISO, local: "" }

  const byLongestCode = [...COUNTRY_CALLING_CODES].sort((a, b) => b.code.length - a.code.length)
  for (const country of byLongestCode) {
    if (digits.startsWith(country.code)) {
      const remainder = digits.slice(country.code.length)
      if (remainder.length >= 7) {
        return { countryIso: country.iso, local: remainder }
      }
    }
  }
  // No recognized calling code up front — almost certainly a legacy
  // value saved before this component existed. Default the country
  // rather than guess, and let the user correct it if it's wrong.
  return { countryIso: DEFAULT_COUNTRY_ISO, local: digits }
}

interface PhoneInputProps {
  id?: string
  value: string
  /** Fires on every keystroke with the composed "<calling code><local
   *  digits>" string — always a full, country-code-prefixed number,
   *  never the bare local part alone. */
  onChange: (fullDigits: string) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * Country-code-aware phone entry — a plain <Input> let staff save a
 * bare local number (no country code) with nothing stopping them,
 * which then went straight to Meta's WhatsApp API as-is. Meta often
 * accepts that call (200 + a wamid) and the actual non-delivery only
 * surfaces later via an async status webhook, so this shipped
 * "successful" sends that silently reached nobody. This always
 * composes a full "<calling code><local number>" value instead.
 */
export function PhoneInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  disabled,
}: PhoneInputProps) {
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO)
  const [local, setLocal] = useState("")
  // Tracks the last value WE produced via `compose`, so the effect
  // below only re-derives {country, local} when `value` changes from
  // OUTSIDE this component (e.g. the parent loaded a different
  // contact) — not on every keystroke, which would fight the split
  // logic against what the user is actively typing.
  const [lastComposedValue, setLastComposedValue] = useState<string | null>(null)

  useEffect(() => {
    if (value === lastComposedValue) return
    const split = splitStoredPhone(value)
    setCountryIso(split.countryIso)
    setLocal(split.local)
    setLastComposedValue(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function compose(nextCountryIso: string, nextLocal: string) {
    const callingCode = COUNTRY_CALLING_CODES.find((c) => c.iso === nextCountryIso)?.code ?? ""
    const full = `${callingCode}${nextLocal.replace(/\D/g, "")}`
    setLastComposedValue(full)
    onChange(full)
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <select
        aria-label="Código de país"
        value={countryIso}
        disabled={disabled}
        onChange={(e) => {
          setCountryIso(e.target.value)
          compose(e.target.value, local)
        }}
        className="w-[6.5rem] shrink-0 rounded-md border border-border bg-muted px-2 text-sm text-foreground disabled:opacity-50"
      >
        {COUNTRY_CALLING_CODES.map((c) => (
          <option key={c.iso} value={c.iso}>
            {c.flag} +{c.code}
          </option>
        ))}
      </select>
      <Input
        id={id}
        value={local}
        disabled={disabled}
        onChange={(e) => {
          setLocal(e.target.value)
          compose(countryIso, e.target.value)
        }}
        onBlur={onBlur}
        placeholder={placeholder}
        className="flex-1 bg-muted border-border text-foreground placeholder:text-muted-foreground"
      />
    </div>
  )
}
