/**
 * Country dial codes for the signup form's phone field. Curated, not
 * exhaustive (no ISO-3166 library dependency — same "hand-rolled,
 * no phone-number package" convention as
 * `src/lib/whatsapp/phone-utils.ts`) — covers Mexico/LatAm (this
 * product's core market) plus the other countries a clinic owner
 * signing up is realistically calling from.
 */
export interface CountryDialCode {
  /** ISO 3166-1 alpha-2, used only as the React key. */
  iso: string;
  name: string;
  dialCode: string;
}

export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { iso: "MX", name: "México", dialCode: "+52" },
  { iso: "US", name: "Estados Unidos", dialCode: "+1" },
  { iso: "CA", name: "Canadá", dialCode: "+1" },
  { iso: "GT", name: "Guatemala", dialCode: "+502" },
  { iso: "BZ", name: "Belice", dialCode: "+501" },
  { iso: "HN", name: "Honduras", dialCode: "+504" },
  { iso: "SV", name: "El Salvador", dialCode: "+503" },
  { iso: "NI", name: "Nicaragua", dialCode: "+505" },
  { iso: "CR", name: "Costa Rica", dialCode: "+506" },
  { iso: "PA", name: "Panamá", dialCode: "+507" },
  { iso: "CU", name: "Cuba", dialCode: "+53" },
  { iso: "DO", name: "República Dominicana", dialCode: "+1" },
  { iso: "PR", name: "Puerto Rico", dialCode: "+1" },
  { iso: "CO", name: "Colombia", dialCode: "+57" },
  { iso: "VE", name: "Venezuela", dialCode: "+58" },
  { iso: "EC", name: "Ecuador", dialCode: "+593" },
  { iso: "PE", name: "Perú", dialCode: "+51" },
  { iso: "BO", name: "Bolivia", dialCode: "+591" },
  { iso: "PY", name: "Paraguay", dialCode: "+595" },
  { iso: "UY", name: "Uruguay", dialCode: "+598" },
  { iso: "AR", name: "Argentina", dialCode: "+54" },
  { iso: "CL", name: "Chile", dialCode: "+56" },
  { iso: "BR", name: "Brasil", dialCode: "+55" },
  { iso: "ES", name: "España", dialCode: "+34" },
  { iso: "PT", name: "Portugal", dialCode: "+351" },
  { iso: "GB", name: "Reino Unido", dialCode: "+44" },
  { iso: "FR", name: "Francia", dialCode: "+33" },
  { iso: "DE", name: "Alemania", dialCode: "+49" },
  { iso: "IT", name: "Italia", dialCode: "+39" },
];

export const DEFAULT_COUNTRY_DIAL_CODE = "+52";
