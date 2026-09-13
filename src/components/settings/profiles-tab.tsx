'use client';

// ============================================================
// ProfilesTab — Settings → Profiles
//
// Tenant-defined "profiles" (account_roles): a named bundle of a
// base role (agent or viewer) plus a per-section visibility map.
// Assigning one to a member narrows their access below their base
// role — see `@/lib/auth/sections` / `@/lib/auth/section-access`.
//
// Admin+ only for mutation; any member can see the read-only list
// (mirrors MembersTab's pattern) since a member with a profile may
// want to understand their own restrictions.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
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
import {
  HIDDEN_ONLY_SECTIONS,
  SECTION_KEYS,
  type SectionKey,
  type SectionOverrides,
  type SectionPermission,
} from '@/lib/auth/sections';
import { SettingsPanelHead } from './settings-panel-head';

interface AccountRoleRow {
  id: string;
  name: string;
  base_role: 'agent' | 'viewer';
  section_overrides: SectionOverrides;
  created_at: string;
}

type PickerValue = 'visible' | SectionPermission;

const EMPTY_FORM = {
  name: '',
  baseRole: 'agent' as 'agent' | 'viewer',
  overrides: {} as SectionOverrides,
};

export function ProfilesTab() {
  const t = useTranslations('Settings.profiles');
  const tSections = useTranslations('Sidebar');

  const [roles, setRoles] = useState<AccountRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccountRoleRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AccountRoleRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/account/roles', { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error || t('loadFailed'));
        return;
      }
      setRoles(payload.roles ?? []);
    } catch {
      toast.error(t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(role: AccountRoleRow) {
    setEditing(role);
    setForm({ name: role.name, baseRole: role.base_role, overrides: role.section_overrides });
    setDialogOpen(true);
  }

  function setSectionValue(section: SectionKey, value: PickerValue) {
    setForm((prev) => {
      const overrides = { ...prev.overrides };
      if (value === 'visible') {
        delete overrides[section];
      } else {
        overrides[section] = value;
      }
      return { ...prev, overrides };
    });
  }

  async function handleSave() {
    const name = form.name.trim();
    if (!name) {
      toast.error(t('nameRequired'));
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/account/roles/${editing.id}` : '/api/account/roles';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          baseRole: form.baseRole,
          sectionOverrides: form.overrides,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error || t('saveFailed'));
        return;
      }
      toast.success(editing ? t('updatedToast', { name }) : t('createdToast', { name }));
      setDialogOpen(false);
      await load();
    } catch {
      toast.error(t('saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      const res = await fetch(`/api/account/roles/${deleting.id}`, { method: 'DELETE' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error || t('deleteFailed'));
        return;
      }
      toast.success(t('deletedToast', { name: deleting.name }));
      setDeleting(null);
      await load();
    } catch {
      toast.error(t('deleteFailed'));
    } finally {
      setDeletingBusy(false);
    }
  }

  function sectionLabel(section: SectionKey): string {
    return tSections(section);
  }

  function summarizeOverrides(overrides: SectionOverrides): string {
    const entries = SECTION_KEYS.filter((s) => overrides[s]).map(
      (s) => `${sectionLabel(s)}: ${t(overrides[s] === 'hidden' ? 'permissionHidden' : 'permissionViewOnly')}`,
    );
    return entries.length > 0 ? entries.join(' · ') : t('noRestrictions');
  }

  return (
    <div>
      <SettingsPanelHead
        title={t('title')}
        description={t('description')}
        action={
          <RequireRole min="admin">
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              {t('newProfile')}
            </Button>
          </RequireRole>
        }
      />

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : roles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <ShieldCheck className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">{t('emptyTitle')}</p>
            <p className="max-w-[46ch] text-sm text-muted-foreground">{t('emptyDesc')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{role.name}</p>
                    <Badge variant="secondary" className="mt-1">
                      {t(role.base_role === 'agent' ? 'baseRoleAgent' : 'baseRoleViewer')}
                    </Badge>
                  </div>
                  <RequireRole min="admin">
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(role)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleting(role)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </RequireRole>
                </div>
                <p className="text-xs text-muted-foreground">{summarizeOverrides(role.section_overrides)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t('editProfile') : t('newProfile')}</DialogTitle>
            <DialogDescription>{t('dialogDesc')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">{t('nameLabel')}</Label>
              <Input
                id="profile-name"
                value={form.name}
                maxLength={60}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('namePlaceholder')}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t('baseRoleLabel')}</Label>
              <Select
                value={form.baseRole}
                onValueChange={(value) => setForm((prev) => ({ ...prev, baseRole: value as 'agent' | 'viewer' }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value: string | null) => (value === 'viewer' ? t('baseRoleViewer') : t('baseRoleAgent'))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">{t('baseRoleAgent')}</SelectItem>
                  <SelectItem value="viewer">{t('baseRoleViewer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('sectionsLabel')}</Label>
              <div className="space-y-2">
                {SECTION_KEYS.map((section) => {
                  const current: PickerValue = form.overrides[section] ?? 'visible';
                  const supportsViewOnly = !HIDDEN_ONLY_SECTIONS.includes(section);
                  return (
                    <div key={section} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground">{sectionLabel(section)}</span>
                      <Select
                        value={current}
                        onValueChange={(value) => setSectionValue(section, value as PickerValue)}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue>
                            {(value: string | null) => {
                              if (value === 'view_only') return t('permissionViewOnly');
                              if (value === 'hidden') return t('permissionHidden');
                              return t('permissionVisible');
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visible">{t('permissionVisible')}</SelectItem>
                          {supportsViewOnly && (
                            <SelectItem value="view_only">{t('permissionViewOnly')}</SelectItem>
                          )}
                          <SelectItem value="hidden">{t('permissionHidden')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('deleteDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteDialogDesc', { name: deleting?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deletingBusy}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletingBusy}>
              {deletingBusy && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {t('deleteBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
