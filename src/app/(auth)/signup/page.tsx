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
import { CheckCircle, Eye, EyeOff, UsersRound } from "lucide-react";
import { getPasswordStrengthError } from "@/lib/password-strength";
import { ACCOUNT_SPECIALTIES, SPECIALTY_LABELS, DENTAL_SPECIALTY, type AccountSpecialty } from "@/lib/specialties";
import { COUNTRY_DIAL_CODES, DEFAULT_COUNTRY_DIAL_CODE } from "@/lib/country-dial-codes";

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
  const [phoneNumber, setPhoneNumber] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

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

    if (!acceptedTerms) {
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
          terms_accepted: acceptedTerms,
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            {inviteToken ? (
              <UsersRound className="h-6 w-6 text-primary" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- static brand asset
              <img src="/zentro-isotipo.png" alt="" className="h-7 w-7" />
            )}
          </div>
          <CardTitle className="text-xl text-foreground">
            {inviteToken ? t("titleInvite") : t("title")}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {inviteToken ? t("descInvite") : t("desc")}
          </CardDescription>
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

            {!inviteToken && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="brandName" className="text-muted-foreground">
                  {t("brandNameLabel")}{" "}
                  <span className="text-xs font-normal text-muted-foreground/70">
                    {t("optional")}
                  </span>
                </Label>
                <Input
                  id="brandName"
                  type="text"
                  placeholder={t("brandNamePlaceholder")}
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground">{t("brandNameHint")}</p>
              </div>
            )}

            {!inviteToken && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="specialty" className="text-muted-foreground">
                  {t("specialtyLabel")}
                </Label>
                <select
                  id="specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value as AccountSpecialty)}
                  className="h-10 rounded-md border border-border bg-muted px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
                >
                  {ACCOUNT_SPECIALTIES.map((value) => (
                    <option key={value} value={value}>
                      {SPECIALTY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!inviteToken && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="phoneNumber" className="text-muted-foreground">
                  {t("phoneLabel")}
                </Label>
                <div className="flex gap-2">
                  <select
                    id="countryCode"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    aria-label={t("countryCodeLabel")}
                    className="h-10 w-28 shrink-0 rounded-md border border-border bg-muted px-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
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
                    className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                  />
                </div>
              </div>
            )}

            {!inviteToken && (
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">{t("addressLabel")}</Label>
                <Input
                  id="addressLine"
                  type="text"
                  placeholder={t("addressLinePlaceholder")}
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="addressCity"
                    type="text"
                    placeholder={t("addressCityPlaceholder")}
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    required
                    className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                  />
                  <Input
                    id="addressState"
                    type="text"
                    placeholder={t("addressStatePlaceholder")}
                    value={addressState}
                    onChange={(e) => setAddressState(e.target.value)}
                    required
                    className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                  />
                </div>
                <Input
                  id="addressPostalCode"
                  type="text"
                  placeholder={t("addressPostalCodePlaceholder")}
                  value={addressPostalCode}
                  onChange={(e) => setAddressPostalCode(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20 w-1/2"
                />
              </div>
            )}

            {!inviteToken && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="website" className="text-muted-foreground">
                  {t("websiteLabel")}{" "}
                  <span className="text-xs font-normal text-muted-foreground/70">
                    {t("optional")}
                  </span>
                </Label>
                <Input
                  id="website"
                  type="url"
                  placeholder={t("websitePlaceholder")}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>
            )}

            {!inviteToken && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="socialLinks" className="text-muted-foreground">
                  {t("socialLinksLabel")}{" "}
                  <span className="text-xs font-normal text-muted-foreground/70">
                    {t("optional")}
                  </span>
                </Label>
                <Input
                  id="socialLinks"
                  type="text"
                  placeholder={t("socialLinksPlaceholder")}
                  value={socialLinks}
                  onChange={(e) => setSocialLinks(e.target.value)}
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>
            )}

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

            <div className="flex items-start gap-2">
              <Checkbox
                id="acceptedTerms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="acceptedTerms" className="text-sm font-normal text-muted-foreground">
                {t.rich("acceptTerms", {
                  terms: (chunks: React.ReactNode) => (
                    <a
                      href="https://zentrolabs.com/terminos.html"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      {chunks}
                    </a>
                  ),
                  privacy: (chunks: React.ReactNode) => (
                    <a
                      href="https://zentrolabs.com/privacidad.html"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </Label>
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
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
              className="text-primary hover:text-primary/80"
            >
              {t("signIn")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
