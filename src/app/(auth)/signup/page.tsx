"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, Check, CheckCircle, Eye, EyeOff, ShieldCheck, UsersRound } from "lucide-react";
import { getPasswordStrengthError } from "@/lib/password-strength";
import { ACCOUNT_SPECIALTIES, SPECIALTY_LABELS, DENTAL_SPECIALTY, type AccountSpecialty } from "@/lib/specialties";
import { COUNTRY_DIAL_CODES, DEFAULT_COUNTRY_DIAL_CODE } from "@/lib/country-dial-codes";
import { ACCOUNT_COUNTRIES, COUNTRY_LABELS, accountCountryFromDialIso, type AccountCountry } from "@/lib/country";

// Plans a visitor can land here wanting to buy directly from
// /pricing (the trial itself isn't in this list — that's the no-param
// default path). Kept as a local literal rather than importing
// PLAN_CONFIG from lib/billing-platform/plans: that module reads
// server-only Stripe env vars at module scope, and this is a client
// component — importing it would either bundle those reads uselessly
// or (worse) tempt a future edit into leaking a price ID client-side.
const PURCHASABLE_PLAN_IDS = ["esencial", "profesional", "clinica"] as const;
type PurchasablePlan = (typeof PURCHASABLE_PLAN_IDS)[number];

const PLAN_LABEL: Record<PurchasablePlan, string> = {
  esencial: "Esencial",
  profesional: "Profesional",
  clinica: "Clínica",
};

function isPurchasablePlan(value: string | null): value is PurchasablePlan {
  return !!value && (PURCHASABLE_PLAN_IDS as readonly string[]).includes(value);
}

// `useSearchParams` opts the component out of static prerendering
// unless wrapped in Suspense — same pattern as /login.
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const t = useTranslations("SignupPage");
  const searchParams = useSearchParams();
  // When the user lands here from `/join/<token>` we carry the
  // invite token in the query so it survives the signup → email
  // verification → redirect round-trip. `emailRedirectTo` below
  // points back at /join/<token> so the user lands on the redeem
  // step after verifying instead of being dropped on /dashboard.
  const inviteToken = searchParams.get("invite");
  // Present when the visitor came from a /pricing "Suscribirme" CTA
  // rather than "Empezar gratis" — after email confirmation we skip
  // the trial-only dashboard landing and go straight into Stripe
  // Checkout for this plan (see StartCheckoutRedirect).
  const planParam = searchParams.get("plan");
  const purchasePlan = isPurchasablePlan(planParam) ? planParam : null;

  const [fullName, setFullName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [specialty, setSpecialty] = useState<AccountSpecialty>(DENTAL_SPECIALTY);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_DIAL_CODE);
  // Account operating country (129_account_country.sql) — drives which
  // legal framework/fields the clinical-record & prescription features
  // show later (Mexico vs Colombia). Pre-suggested from the phone dial
  // code above, but the user must confirm/can override it, so once they
  // touch this selector directly we stop overwriting it from the phone
  // field.
  const [country, setCountry] = useState<AccountCountry>(() =>
    accountCountryFromDialIso(
      COUNTRY_DIAL_CODES.find((c) => c.dialCode === DEFAULT_COUNTRY_DIAL_CODE)?.iso,
    ),
  );
  const [countryManuallySet, setCountryManuallySet] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  // 2-step wizard (visual redesign matching the "Autenticación Zentro
  // Med" mockup's paso1/paso2) — only for the plain signup path. The
  // invited-member path (fewer fields, no clinic data) keeps its
  // original single centered card, unchanged.
  const [step, setStep] = useState<1 | 2>(1);

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) return;
    if (!licenseNumber.trim()) {
      setError(t("licenseNumberRequired"));
      return;
    }
    const strengthError = getPasswordStrengthError(password);
    if (strengthError) {
      setError(t(`passwordRule_${strengthError}` as Parameters<typeof t>[0]));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    const digitsOnlyPhone = phoneNumber.replace(/\D/g, "");
    if (!digitsOnlyPhone) {
      setError(t("phoneRequired"));
      return;
    }
    setStep(2);
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    const strengthError = getPasswordStrengthError(password);
    if (strengthError) {
      setError(t(`passwordRule_${strengthError}` as Parameters<typeof t>[0]));
      return;
    }

    const digitsOnlyPhone = phoneNumber.replace(/\D/g, "");
    if (!inviteToken && !digitsOnlyPhone) {
      setError(t("phoneRequired"));
      return;
    }

    if (
      !inviteToken &&
      (!addressLine.trim() || !addressCity.trim() || !addressState.trim() || !addressPostalCode.trim())
    ) {
      setError(t("addressRequired"));
      return;
    }

    if (!licenseNumber.trim()) {
      setError(t("licenseNumberRequired"));
      return;
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      setError(t("termsRequired"));
      return;
    }

    setLoading(true);

    // Every path now routes through /auth/callback, which exchanges
    // the PKCE code for a session and then forwards to `next`:
    //   - invite token  → /join/<token>, so they land on the accept step
    //   - purchase plan → /dashboard?startCheckout=<plan>, so
    //     StartCheckoutRedirect sends them straight into Stripe
    //     Checkout instead of the empty trial dashboard
    //   - plain trial   → /dashboard
    const rawNext = inviteToken
      ? `/join/${encodeURIComponent(inviteToken)}`
      : purchasePlan
        ? `/dashboard?startCheckout=${purchasePlan}`
        : "/dashboard";
    // Flags the destination so it shows a "your account is confirmed"
    // toast (see AuthConfirmedToast in the root layout) — baked in
    // here, not in /auth/callback itself, since that route is shared
    // with password-reset and impersonation links that shouldn't get
    // this toast.
    const next = `${rawNext}${rawNext.includes("?") ? "&" : "?"}auth=confirmed`;
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    // Free-text — accounts.address is a single column (see
    // 046_account_address_tax_id.sql), so the separate street/city/
    // state/postal-code inputs below are joined into one line here
    // rather than adding four more DB columns for data that only ever
    // renders as one address line on the quote PDF header.
    const joinedAddress = [addressLine, addressCity, addressState, addressPostalCode]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", ");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          // Read by handle_new_user() (042_account_brand_name.sql) to
          // seed accounts.name — falls back to full_name/email when
          // blank, same as before this field existed.
          brand_name: brandName.trim() || undefined,
          // Read by the same trigger (076_account_specialty.sql) to
          // seed accounts.specialty — controls whether the Odontograma
          // tab shows on a contact (see src/lib/specialties.ts).
          specialty: inviteToken ? undefined : specialty,
          // Read by the same trigger (129_account_country.sql) to seed
          // accounts.country — drives which legal framework/fields the
          // clinical-record & prescription features show (MX vs CO).
          country: inviteToken ? undefined : country,
          // Read by the same trigger (085_account_phone_signup.sql) to
          // seed accounts.phone/address — an invited member joins an
          // existing account, so these don't apply to them.
          phone: inviteToken ? undefined : `${countryCode}${digitsOnlyPhone}`,
          address: inviteToken ? undefined : joinedAddress || undefined,
          website: inviteToken ? undefined : website.trim() || undefined,
          social_links: inviteToken ? undefined : socialLinks.trim() || undefined,
          // Read by the same trigger (086_signup_required_fields.sql).
          // license_number is personal (profiles), not account-level —
          // collected for every new user, invited or not.
          license_number: licenseNumber.trim(),
          terms_accepted: acceptedTerms && acceptedPrivacy,
        },
        emailRedirectTo,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If "Confirm email" is off in Supabase Auth settings, signUp()
    // returns an already-active session instead of requiring a click
    // on a confirmation link — the emailRedirectTo above then never
    // fires, since there's no email round-trip. Without this check, a
    // visitor who clicked a paid-plan CTA would land in the app fully
    // signed in and never see Stripe Checkout. Send them where the
    // redirect would have gone, right now, client-side.
    if (data.session) {
      window.location.href = next;
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">
              {t("checkEmailTitle")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t.rich("checkEmailDesc", {
                email,
                bold: (chunks: React.ReactNode) => <span className="text-foreground">{chunks}</span>,
              })}
              {purchasePlan ? (
                <>
                  {" "}
                  {t.rich("checkEmailPlanHint", {
                    plan: PLAN_LABEL[purchasePlan],
                    bold: (chunks: React.ReactNode) => <span className="text-foreground">{chunks}</span>,
                  })}
                </>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
            >
              <Button
                variant="outline"
                className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {t("backToSignIn")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Invited-member path — unchanged single centered card (fewer
  // fields, no clinic data since they're joining an existing account).
  // ------------------------------------------------------------
  if (inviteToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <UsersRound className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">{t("titleInvite")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("descInvite")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="fullName" className="text-muted-foreground">
                  {t("fullNameLabel")}
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t("fullNamePlaceholder")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="licenseNumber" className="text-muted-foreground">
                  {t("licenseNumberLabel")}
                </Label>
                <Input
                  id="licenseNumber"
                  type="text"
                  placeholder={t("licenseNumberPlaceholder")}
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground">{t("licenseNumberHint")}</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-muted-foreground">
                  {t("emailLabel")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-muted-foreground">
                  {t("passwordLabel")}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword" className="text-muted-foreground">
                  {t("confirmPasswordLabel")}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t("confirmPasswordPlaceholder")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? t("hidePassword") : t("showPassword")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="acceptedTerms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  />
                  <Label htmlFor="acceptedTerms" className="text-sm font-normal text-muted-foreground">
                    {t.rich("acceptTermsOnly", {
                      terms: (chunks: React.ReactNode) => (
                        <a href="/terminos" target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 underline">
                          {chunks}
                        </a>
                      ),
                    })}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="acceptedPrivacy"
                    checked={acceptedPrivacy}
                    onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
                  />
                  <Label htmlFor="acceptedPrivacy" className="text-sm font-normal text-muted-foreground">
                    {t.rich("acceptPrivacyOnly", {
                      privacy: (chunks: React.ReactNode) => (
                        <a href="https://zentrolabs.com/privacidad.html" target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 underline">
                          {chunks}
                        </a>
                      ),
                    })}
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-2 h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? t("creatingAccount") : t("createAccount")}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("haveAccount")}{" "}
              <Link href={`/login?invite=${encodeURIComponent(inviteToken)}`} className="text-primary hover:text-primary/80">
                {t("signIn")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Plain signup — 2-step wizard, split panel (matches the
  // "Autenticación Zentro Med" mockup's paso1/paso2). Fixed brand
  // palette (not the app's selectable theme tokens) — same choice
  // already made for /terminos and the marketing pages, since this
  // is a pre-auth brand surface, not an in-app screen.
  // ------------------------------------------------------------
  const asideCopy =
    step === 1
      ? {
          kicker: t("asideKicker1"),
          title: t("asideTitle1"),
          text: t("asideText1"),
          bullets: [t("asideBullet1_1"), t("asideBullet1_2"), t("asideBullet1_3")],
        }
      : {
          kicker: t("asideKicker2"),
          title: t("asideTitle2"),
          text: t("asideText2"),
          bullets: [t("asideBullet2_1"), t("asideBullet2_2"), t("asideBullet2_3")],
        };

  const fieldClass =
    "h-[50px] rounded-[13px] border border-[#D6DEDA] bg-white px-4 text-[15px] text-[#0C1B14] outline-none placeholder:text-[#8A9A92] focus-visible:border-[#0E7C4A] focus-visible:ring-4 focus-visible:ring-[#0E7C4A]/10";
  const selectClass =
    "h-[50px] rounded-[13px] border border-[#D6DEDA] bg-white px-4 text-[15px] text-[#0C1B14] outline-none focus-visible:border-[#0E7C4A]";
  const labelClass = "text-[13px] font-semibold text-[#26382E]";

  return (
    <div className="flex min-h-screen bg-[#F7F9F8]">
      {/* PANEL IZQUIERDO */}
      <aside className="relative hidden w-[420px] shrink-0 flex-col overflow-hidden bg-[#0B2A1E] p-10 lg:flex xl:w-[440px]">
        <div
          className="pointer-events-none absolute -bottom-56 -left-36 h-[600px] w-[600px] rounded-full"
          style={{ background: "radial-gradient(ellipse at center, rgba(34,169,108,0.34) 0%, transparent 66%)" }}
        />
        <div className="relative flex shrink-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
          <img src="/zentro-isotipo.png" alt="" className="h-7 w-7" />
          <span className="text-[17px] font-semibold tracking-tight text-white">Zentro Med</span>
        </div>

        <div className="relative mt-auto pt-8">
          <div className="font-mono text-[11px] font-semibold tracking-[0.09em] text-[#7BE3A8]">{asideCopy.kicker}</div>
          <h2 className="mt-3.5 mb-3 text-[28px] font-semibold leading-[1.12] tracking-tight text-white text-balance">
            {asideCopy.title}
          </h2>
          <p className="text-[15px] leading-relaxed text-[#A8CDBA] text-balance">{asideCopy.text}</p>

          <div className="mt-6 flex flex-col gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
            {asideCopy.bullets.map((bullet) => (
              <div key={bullet} className="flex items-start gap-3 bg-white/[0.04] px-4 py-3.5">
                <Check className="mt-0.5 size-3.5 shrink-0 text-[#7BE3A8]" strokeWidth={3} />
                <span className="text-sm leading-snug text-[#D9EDE2]">{bullet}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-auto shrink-0 pt-7">
          <div className="flex items-start gap-2.5 border-t border-white/10 pt-5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#7BE3A8]" />
            <span className="text-xs leading-relaxed text-[#7FA893]">{t("asideLegal")}</span>
          </div>
        </div>
      </aside>

      {/* PANEL DERECHO */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="flex h-[68px] shrink-0 items-center gap-3.5 px-6 sm:px-10">
          <span className="text-[13.5px] text-[#5B6B62]">{t("haveAccount")}</span>
          <Link
            href="/login"
            className="rounded-full border border-[#D6DEDA] bg-white px-4 py-2 text-[13.5px] font-semibold text-[#0C1B14] hover:border-[#0E7C4A] hover:text-[#0A5C37]"
          >
            {t("signIn")}
          </Link>
        </div>

        <div className="relative flex flex-1 flex-col overflow-auto px-6 pb-10 sm:px-10">
          <div className="mx-auto w-full max-w-[600px]">
            {/* Stepper */}
            <div className="mb-6 flex items-center gap-2.5">
              {[
                { n: 1, label: t("stepIdentityLabel") },
                { n: 2, label: t("stepClinicLabel") },
              ].map((s, i) => {
                const done = s.n < step;
                const now = s.n === step;
                return (
                  <div key={s.n} className="flex items-center gap-2.5">
                    <span
                      className={`flex size-[25px] shrink-0 items-center justify-center rounded-full border-[1.5px] font-mono text-[11.5px] font-semibold ${
                        done
                          ? "border-[#0E7C4A] bg-[#0E7C4A] text-white"
                          : now
                            ? "border-[#0E7C4A] bg-[#F4FAF6] text-[#0A5C37]"
                            : "border-[#DCE4E0] bg-transparent text-[#8A9A92]"
                      }`}
                    >
                      {done ? "✓" : s.n}
                    </span>
                    <span
                      className={`whitespace-nowrap text-[13px] ${now ? "font-semibold text-[#0C1B14]" : done ? "font-medium text-[#0A5C37]" : "font-medium text-[#8A9A92]"}`}
                    >
                      {s.label}
                    </span>
                    {i === 0 && <span className="h-[1.5px] w-[18px] bg-[#DCE4E0]" />}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* PASO 1 · IDENTIDAD PROFESIONAL */}
            {step === 1 && (
              <form onSubmit={handleContinue} className="flex flex-col gap-4">
                <div>
                  <h1 className="mb-2.5 text-[34px] font-semibold leading-tight tracking-tight text-[#0C1B14]">
                    {t("step1Title")}
                  </h1>
                  <p className="mb-1 text-[16px] leading-snug text-[#5B6B62] text-balance">{t("step1Desc")}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="fullName" className={labelClass}>
                    {t("fullNameLabel")}
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={t("fullNamePlaceholder")}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className={fieldClass}
                  />
                </div>

                {/* Tarjeta de registro profesional — estilo del mockup,
                    sin ninguna validación en vivo (no hay integración con
                    RNPE/ReTHUS): es solo tratamiento visual. */}
                <div className="rounded-2xl border border-[#0E7C4A] bg-white p-5 shadow-[0_0_0_3px_rgba(14,124,74,0.08)]">
                  <span className="font-mono text-[11px] font-semibold tracking-[0.07em] text-[#0A5C37]">
                    {t("licenseCardKicker")}
                  </span>
                  <div className="mt-3.5 grid grid-cols-2 gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="accountCountry" className={labelClass}>
                        {t("countryLabel")}
                      </Label>
                      <select
                        id="accountCountry"
                        value={country}
                        onChange={(e) => {
                          setCountry(e.target.value as AccountCountry);
                          setCountryManuallySet(true);
                        }}
                        className={selectClass}
                      >
                        {ACCOUNT_COUNTRIES.map((value) => (
                          <option key={value} value={value}>
                            {COUNTRY_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="specialty" className={labelClass}>
                        {t("specialtyLabel")}
                      </Label>
                      <select
                        id="specialty"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value as AccountSpecialty)}
                        className={selectClass}
                      >
                        {ACCOUNT_SPECIALTIES.map((value) => (
                          <option key={value} value={value}>
                            {SPECIALTY_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3.5 flex flex-col gap-1.5">
                    <Label htmlFor="licenseNumber" className={labelClass}>
                      {t("licenseNumberLabel")}
                    </Label>
                    <Input
                      id="licenseNumber"
                      type="text"
                      placeholder={t("licenseNumberPlaceholder")}
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      required
                      className={`${fieldClass} font-mono font-semibold tracking-wide`}
                    />
                    <p className="text-xs text-[#5B6B62]">{t("licenseNumberHint")}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email" className={labelClass}>
                    {t("emailLabel")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={fieldClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password" className={labelClass}>
                      {t("passwordLabel")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t("passwordPlaceholder")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className={`${fieldClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5B6B62] hover:text-[#0C1B14]"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="confirmPassword" className={labelClass}>
                      {t("confirmPasswordLabel")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder={t("confirmPasswordPlaceholder")}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={`${fieldClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={showConfirmPassword ? t("hidePassword") : t("showPassword")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5B6B62] hover:text-[#0C1B14]"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="phoneNumber" className={labelClass}>
                    {t("phoneLabel")}
                  </Label>
                  <div className="flex gap-2">
                    <select
                      id="countryCode"
                      value={countryCode}
                      onChange={(e) => {
                        const nextDialCode = e.target.value;
                        setCountryCode(nextDialCode);
                        if (!countryManuallySet) {
                          const iso = COUNTRY_DIAL_CODES.find((c) => c.dialCode === nextDialCode)?.iso;
                          setCountry(accountCountryFromDialIso(iso));
                        }
                      }}
                      aria-label={t("countryCodeLabel")}
                      className={`${selectClass} w-32 shrink-0 px-2`}
                    >
                      {COUNTRY_DIAL_CODES.map((c) => (
                        <option key={c.iso} value={c.dialCode}>
                          {c.name} {c.dialCode}
                        </option>
                      ))}
                    </select>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder={t("phonePlaceholder")}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      className={`${fieldClass} flex-1`}
                    />
                  </div>
                  <p className="text-xs leading-relaxed text-[#5B6B62]">{t("passwordHint")}</p>
                </div>

                <Button
                  type="submit"
                  className="mt-1 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full bg-[#0E7C4A] text-base font-semibold text-white hover:bg-[#0A5C37]"
                >
                  {t("continueButton")}
                  <ArrowRight className="size-4" />
                </Button>
              </form>
            )}

            {/* PASO 2 · DATOS DEL CONSULTORIO */}
            {step === 2 && (
              <form onSubmit={handleSignup} className="flex flex-col gap-4">
                <div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="mb-3 text-[13px] font-semibold text-[#5B6B62] hover:text-[#0A5C37]"
                  >
                    ← {t("backButton")}
                  </button>
                  <h1 className="mb-2.5 text-[34px] font-semibold leading-tight tracking-tight text-[#0C1B14]">
                    {t("step2Title")}
                  </h1>
                  <p className="mb-1 text-[16px] leading-snug text-[#5B6B62] text-balance">{t("step2Desc")}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="brandName" className={labelClass}>
                    {t("brandNameLabel")} <span className="text-xs font-normal text-[#8A9A92]">{t("optional")}</span>
                  </Label>
                  <Input
                    id="brandName"
                    type="text"
                    placeholder={t("brandNamePlaceholder")}
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className={fieldClass}
                  />
                  <p className="text-xs text-[#5B6B62]">{t("brandNameHint")}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className={labelClass}>{t("addressLabel")}</Label>
                  <Input
                    id="addressLine"
                    type="text"
                    placeholder={t("addressLinePlaceholder")}
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    required
                    className={fieldClass}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      id="addressCity"
                      type="text"
                      placeholder={t("addressCityPlaceholder")}
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      required
                      className={fieldClass}
                    />
                    <Input
                      id="addressState"
                      type="text"
                      placeholder={t("addressStatePlaceholder")}
                      value={addressState}
                      onChange={(e) => setAddressState(e.target.value)}
                      required
                      className={fieldClass}
                    />
                  </div>
                  <Input
                    id="addressPostalCode"
                    type="text"
                    placeholder={t("addressPostalCodePlaceholder")}
                    value={addressPostalCode}
                    onChange={(e) => setAddressPostalCode(e.target.value)}
                    required
                    className={`${fieldClass} w-1/2 font-mono`}
                  />
                </div>

                <div className="rounded-2xl border border-[#E1E7E3] bg-[#FBFCFB] p-4.5">
                  <div className="mb-3.5 flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold tracking-[0.07em] text-[#5B6B62]">
                      {t("websiteLabel").toUpperCase()}
                    </span>
                    <span className="text-xs text-[#8A9A92]">{t("optional")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="website" className={labelClass}>
                        {t("websiteLabel")}
                      </Label>
                      <Input
                        id="website"
                        type="url"
                        placeholder={t("websitePlaceholder")}
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="socialLinks" className={labelClass}>
                        {t("socialLinksLabel")}
                      </Label>
                      <Input
                        id="socialLinks"
                        type="text"
                        placeholder={t("socialLinksPlaceholder")}
                        value={socialLinks}
                        onChange={(e) => setSocialLinks(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="acceptedTerms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    />
                    <Label htmlFor="acceptedTerms" className="text-sm font-normal text-[#26382E]">
                      {t.rich("acceptTermsOnly", {
                        terms: (chunks: React.ReactNode) => (
                          <a href="/terminos" target="_blank" rel="noreferrer" className="text-[#0E7C4A] underline hover:text-[#0A5C37]">
                            {chunks}
                          </a>
                        ),
                      })}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="acceptedPrivacy"
                      checked={acceptedPrivacy}
                      onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
                    />
                    <Label htmlFor="acceptedPrivacy" className="text-sm font-normal text-[#26382E]">
                      {t.rich("acceptPrivacyOnly", {
                        privacy: (chunks: React.ReactNode) => (
                          <a href="https://zentrolabs.com/privacidad.html" target="_blank" rel="noreferrer" className="text-[#0E7C4A] underline hover:text-[#0A5C37]">
                            {chunks}
                          </a>
                        ),
                      })}
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full bg-[#0E7C4A] text-base font-semibold text-white hover:bg-[#0A5C37] disabled:opacity-50"
                >
                  {loading ? t("creatingAccount") : t("createAccount")}
                  {!loading && <ArrowRight className="size-4" />}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
