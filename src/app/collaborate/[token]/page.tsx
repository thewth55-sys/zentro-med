'use client';

// ============================================================
// /collaborate/[token] — collaborator-invitation acceptance page
// (137_account_collaborators.sql).
//
// Same 4-state shape as /join/[token] (see that file's comment),
// but simpler: there's no role picker (a collaborator is always
// 'agent') and accepting NEVER moves the caller's own account —
// `accept_collaborator_invitation` only inserts/upserts into
// account_collaborators, so there's no 409 "you already have data"
// conflict case to handle here.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, CheckCircle, Loader2, MailX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

interface PeekOk {
  ok: true;
  account_name: string;
  expires_at: string;
}
interface PeekFail {
  ok: false;
  reason: 'not_found' | 'used' | 'expired' | 'server_error';
}
type PeekResult = PeekOk | PeekFail;

const FAIL_COPY: Record<PeekFail['reason'], { title: string; body: string }> = {
  not_found: {
    title: 'Invite not found',
    body: 'This link doesn’t match a valid collaboration invitation. Double-check the URL or ask whoever invited you to send a new one.',
  },
  used: {
    title: 'Invite already used',
    body: 'This invitation has already been accepted. If that wasn’t you, ask the account admin to send a fresh link.',
  },
  expired: {
    title: 'Invite expired',
    body: 'This invitation has expired. Ask the account admin to send a new one.',
  },
  server_error: {
    title: 'Something went wrong',
    body: 'We couldn’t verify this invitation right now. Try refreshing the page in a moment.',
  },
};

export default function CollaboratePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [peek, setPeek] = useState<PeekResult | null>(null);
  const [authedUserId, setAuthedUserId] = useState<string | null | undefined>(undefined);
  const [accepting, setAccepting] = useState(false);

  const loadPeekAndAuth = useCallback(async () => {
    if (!token) return;
    setPeek(null);
    setAuthedUserId(undefined);
    try {
      const [peekRes, authRes] = await Promise.all([
        fetch(`/api/collaborate/${encodeURIComponent(token)}/peek`, { cache: 'no-store' }),
        createClient().auth.getUser(),
      ]);
      const peekBody = (await peekRes.json()) as PeekResult;
      setPeek(peekBody);
      setAuthedUserId(authRes.data.user?.id ?? null);
    } catch (err) {
      console.error('[collaborate] peek error:', err);
      setPeek({ ok: false, reason: 'server_error' });
      setAuthedUserId(null);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const [peekRes, authRes] = await Promise.all([
          fetch(`/api/collaborate/${encodeURIComponent(token)}/peek`, { cache: 'no-store' }),
          createClient().auth.getUser(),
        ]);
        const peekBody = (await peekRes.json()) as PeekResult;
        if (cancelled) return;
        setPeek(peekBody);
        setAuthedUserId(authRes.data.user?.id ?? null);
      } catch (err) {
        console.error('[collaborate] peek error:', err);
        if (cancelled) return;
        setPeek({ ok: false, reason: 'server_error' });
        setAuthedUserId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = useCallback(async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/collaborate/${encodeURIComponent(token)}/accept`, { method: 'POST' });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(payload.error || 'Failed to accept invitation');
        setAccepting(false);
        return;
      }
      toast.success('You can now switch into this account from your account menu');
      // Full reload so AuthProvider re-fetches profile + collaborations.
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('[collaborate] accept error:', err);
      toast.error('Could not reach the server');
      setAccepting(false);
    }
  }, [token]);

  if (peek === null || authedUserId === undefined) {
    return (
      <Card className="w-full max-w-md border-border bg-card">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying invitation…</p>
        </CardContent>
      </Card>
    );
  }

  if (!peek.ok) {
    const copy = FAIL_COPY[peek.reason];
    return (
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
            <MailX className="h-6 w-6 text-red-400" />
          </div>
          <CardTitle className="text-xl text-foreground">{copy.title}</CardTitle>
          <CardDescription className="text-muted-foreground">{copy.body}</CardDescription>
        </CardHeader>
        {peek.reason === 'server_error' && (
          <CardContent>
            <Button onClick={loadPeekAndAuth} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Try again
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  const inviteHeader = (
    <CardHeader className="items-center text-center">
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Building2 className="h-6 w-6 text-primary" />
      </div>
      <CardTitle className="text-xl text-foreground">
        <span className="text-primary">{peek.account_name}</span> invites you to collaborate
      </CardTitle>
      <CardDescription className="text-muted-foreground">
        You&apos;ll be able to see and manage its patients, agenda, clinical notes and prescriptions —
        without leaving your own account. Link valid until{' '}
        {new Date(peek.expires_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}.
      </CardDescription>
    </CardHeader>
  );

  if (authedUserId) {
    return (
      <Card className="w-full max-w-md border-border bg-card">
        {inviteHeader}
        <CardContent className="flex flex-col gap-3">
          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {accepting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Accepting…
              </>
            ) : (
              <>
                <CheckCircle className="size-4" />
                Accept invitation
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Your own account is never affected — you can switch back to it anytime from the account menu.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Unlike /join/[token], there's no `?invite=` wiring for this flow
  // in signup/login (that param is specific to the internal
  // account_invitations redirect) — so this sends the visitor to a
  // plain signup/login and asks them to come back to this same link
  // afterward, rather than half-wiring a redirect param that only
  // this one page would understand.
  return (
    <Card className="w-full max-w-md border-border bg-card">
      {inviteHeader}
      <CardContent className="flex flex-col gap-2">
        <Link href="/signup">
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            Create an account
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground">
            I already have an account
          </Button>
        </Link>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Then come back to this same link to accept the invitation.
        </p>
      </CardContent>
    </Card>
  );
}
