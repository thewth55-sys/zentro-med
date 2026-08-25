"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (code?: string) => void;
          "timeout-callback"?: () => void;
          retry?: "auto" | "never";
          "retry-interval"?: number;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  /** Called with `true` when the captcha can't solve (error or timeout) and
   *  fail-open is enabled — lets the caller allow the submit anyway; `false`
   *  when it solves again. */
  onUnavailable?: (unavailable: boolean) => void;
}

// If there's no token and no explicit error after this long (the classic
// "Verifying…" spinner that hangs on a device with a skewed clock or a
// filtering DNS/VPN), treat it as a failure and offer a retry instead of
// leaving the user stuck behind a disabled button forever.
const SOLVE_TIMEOUT_MS = 20_000;
const FAIL_OPEN = process.env.NEXT_PUBLIC_TURNSTILE_FAIL_OPEN === "true";

/**
 * Cloudflare Turnstile widget. Renders nothing (and never blocks the
 * caller) when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` isn't configured —
 * keeps local dev working without a Cloudflare account. The matching
 * server-side skip lives in /api/auth/login (see TURNSTILE_SECRET_KEY).
 *
 * Resilience: native auto-retry plus our own timeout that catches the
 * infinite "Verifying…" (which never fires error-callback), showing a
 * message + "Retry" instead of locking the user out. When the server runs
 * with NEXT_PUBLIC_TURNSTILE_FAIL_OPEN, it also signals onUnavailable so
 * the login can proceed without a token.
 */
export function TurnstileWidget({ onVerify, onExpire, onUnavailable }: TurnstileWidgetProps) {
  const t = useTranslations("LoginPage");
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const solvedRef = useRef(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const markFailed = useCallback(() => {
    if (solvedRef.current) return;
    setFailed(true);
    if (FAIL_OPEN) onUnavailable?.(true);
  }, [onUnavailable]);

  const armTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(markFailed, SOLVE_TIMEOUT_MS);
  }, [markFailed]);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !siteKey || !window.turnstile) return;
    solvedRef.current = false;
    setFailed(false);
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => {
        solvedRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        setFailed(false);
        onUnavailable?.(false);
        onVerify(token);
      },
      "expired-callback": () => {
        onExpire?.();
        armTimer();
      },
      "error-callback": () => markFailed(),
      "timeout-callback": () => markFailed(),
      retry: "auto",
      "retry-interval": 4000,
    });
    armTimer();
  }, [siteKey, onVerify, onExpire, markFailed, armTimer, onUnavailable]);

  useEffect(() => {
    if (!scriptLoaded || !siteKey || widgetIdRef.current) return;
    renderWidget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded, siteKey]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleRetry = useCallback(() => {
    setFailed(false);
    onUnavailable?.(false);
    solvedRef.current = false;
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      armTimer();
    } else {
      renderWidget();
    }
  }, [armTimer, renderWidget, onUnavailable]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} />
      {failed ? (
        <div className="mt-2 rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          {t("captchaFailed")}{" "}
          <button
            type="button"
            onClick={handleRetry}
            className="font-medium text-primary underline"
          >
            {t("captchaRetry")}
          </button>
          {FAIL_OPEN ? <span className="mt-1 block">{t("captchaContinueAnyway")}</span> : null}
        </div>
      ) : null}
    </>
  );
}
