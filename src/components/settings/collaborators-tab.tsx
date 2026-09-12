'use client';

// ============================================================
// CollaboratorsTab — Settings → External collaborators
// (137_account_collaborators.sql)
//
// Two stacked sections, same shape as MembersTab:
//   1. Active collaborators — external users currently granted
//      scoped access to THIS account. Admin+ can revoke.
//   2. Pending invitations — outstanding invite links, not yet
//      accepted. Admin+ can create a new one / let it expire.
//
// A collaborator never becomes a member of this account (no row in
// `profiles` changes) — they get a row in `account_collaborators`,
// always at a fixed 'agent' role, scoped to patients/agenda/clinical
// records only (see the migration header for the full RLS story).
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Copy, Loader2, Mail, Plus, ShieldOff, Sparkles, UserX } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RequireRole } from '@/components/auth/require-role';
import { SettingsPanelHead } from './settings-panel-head';

interface Collaborator {
  id: string;
  collaborator_user_id: string;
  status: 'active' | 'revoked';
  label: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface PendingInvitation {
  id: string;
  label: string | null;
  created_at: string;
  expires_at: string;
}

const MAX_LABEL_LEN = 80;
const EXPIRY_OPTIONS = [
  { value: '1', labelKey: 'days1' },
  { value: '7', labelKey: 'days7' },
  { value: '30', labelKey: 'days30' },
];

interface CreatedInvite {
  url: string;
  expiresInDays: number;
}

function CreateInvitationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const t = useTranslations('Settings.collaborators');
  const [label, setLabel] = useState('');
  const [expiry, setExpiry] = useState('7');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreatedInvite | null>(null);

  function reset() {
    setLabel('');
    setExpiry('7');
    setSubmitting(false);
    setResult(null);
  }

  async function handleCreate() {
    const trimmed = label.trim();
    if (trimmed.length > MAX_LABEL_LEN) {
      toast.error(t('labelTooLong', { max: MAX_LABEL_LEN }));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/account/collaborators/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: trimmed || undefined, expiresInDays: Number(expiry) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || t('createFailed'));
        return;
      }
      setResult({ url: data.url, expiresInDays: Number(expiry) });
      onCreated();
    } catch (err) {
      console.error('[CreateInvitationDialog] create error:', err);
      toast.error(t('createFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      toast.success(t('copied'));
    } catch {
      toast.error(t('clipboardBlocked'));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="bg-popover border-border sm:max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-popover-foreground">
                <Sparkles className="size-4 text-primary" />
                {t('inviteCreated')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t('inviteCreatedDesc', { days: result.expiresInDays })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label className="text-muted-foreground">{t('inviteLink')}</Label>
              <div className="flex gap-2">
                <Input readOnly value={result.url} className="border-border bg-muted text-xs text-foreground" />
                <Button type="button" variant="outline" onClick={copyLink} className="border-border shrink-0">
                  <Copy className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('shareHint')}</p>
            </div>
            <DialogFooter className="bg-popover border-border">
              <Button onClick={() => onOpenChange(false)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {t('done')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-popover-foreground">
                <Building2 className="size-4 text-primary" />
                {t('inviteTitle')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">{t('inviteDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">{t('labelField')}</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={MAX_LABEL_LEN}
                  placeholder={t('labelPlaceholder')}
                  className="border-border bg-muted text-foreground"
                />
                <p className="text-xs text-muted-foreground">{t('labelHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">{t('expiryField')}</Label>
                <Select value={expiry} onValueChange={(v) => setExpiry(v ?? '7')}>
                  <SelectTrigger className="border-border bg-muted text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
                    {EXPIRY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {t(o.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="bg-popover border-border">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border text-muted-foreground hover:bg-muted">
                {t('cancel')}
              </Button>
              <Button onClick={handleCreate} disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                {t('createInvite')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CollaboratorsTab() {
  const t = useTranslations('Settings.collaborators');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [collabRes, inviteRes] = await Promise.all([
        fetch('/api/account/collaborators'),
        fetch('/api/account/collaborators/invitations'),
      ]);
      const collabData = await collabRes.json().catch(() => ({}));
      const inviteData = await inviteRes.json().catch(() => ({}));
      setCollaborators(collabData.collaborators ?? []);
      setInvitations(inviteData.invitations ?? []);
    } catch (err) {
      console.error('[CollaboratorsTab] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/account/collaborators/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'revoked' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || t('revokeFailed'));
        return;
      }
      toast.success(t('revoked'));
      await load();
    } catch (err) {
      console.error('[CollaboratorsTab] revoke error:', err);
      toast.error(t('revokeFailed'));
    } finally {
      setRevokingId(null);
    }
  }

  const active = collaborators.filter((c) => c.status === 'active');
  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

  return (
    <div className="space-y-8">
      <SettingsPanelHead
        title={t('title')}
        description={t('description')}
        action={
          <RequireRole min="admin">
            <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              {t('inviteButton')}
            </Button>
          </RequireRole>
        }
      />

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">{t('activeTitle')}</p>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : active.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{t('activeEmpty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {active.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{c.label || t('noLabel')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('activeSince', { date: dateFormatter.format(new Date(c.created_at)) })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="success">{t('badgeActive')}</Badge>
                    <RequireRole min="admin">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(c.id)}
                        disabled={revokingId === c.id}
                        className="text-red-400 hover:text-red-300"
                      >
                        {revokingId === c.id ? <Loader2 className="size-4 animate-spin" /> : <ShieldOff className="size-4" />}
                      </Button>
                    </RequireRole>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">{t('pendingTitle')}</p>
          </div>
          {loading ? null : invitations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{t('pendingEmpty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{inv.label || t('noLabel')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('expiresOn', { date: dateFormatter.format(new Date(inv.expires_at)) })}
                    </p>
                  </div>
                  <UserX className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <RequireRole min="admin">
        <CreateInvitationDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={load} />
      </RequireRole>
    </div>
  );
}
