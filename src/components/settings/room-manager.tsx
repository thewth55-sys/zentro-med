'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, DoorOpen, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useCan } from '@/hooks/use-can';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import type { Room } from '@/types';

/**
 * Consultorios (exam rooms) card — plain name + active toggle, no
 * colour picker needed (unlike tags). Same fetch/inline-create/
 * confirm-delete shape as TagManager.
 */
export function RoomManager() {
  const t = useTranslations('Settings.scheduling.rooms');
  const supabase = createClient();
  const { accountId, loading: authLoading } = useAuth();
  const canEdit = useCan('edit-settings');

  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!accountId) {
      setLoading(false);
      return;
    }
    fetchRooms(accountId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, accountId]);

  async function fetchRooms(acctId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('account_id', acctId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setRooms(data || []);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
      toast.error(t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !accountId) return;
    try {
      setSaving(true);
      const { error } = await supabase.from('rooms').insert({
        account_id: accountId,
        name: newName.trim(),
      });
      if (error) throw error;
      toast.success(t('created'));
      setNewName('');
      await fetchRooms(accountId);
    } catch (err) {
      console.error('Create room error:', err);
      toast.error(t('createFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(room: Room) {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ is_active: !room.is_active })
        .eq('id', room.id);
      if (error) throw error;
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, is_active: !r.is_active } : r))
      );
    } catch (err) {
      console.error('Toggle room error:', err);
      toast.error(t('updateFailed'));
    }
  }

  function confirmDelete(room: Room) {
    setRoomToDelete(room);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!roomToDelete) return;
    try {
      setDeleting(true);
      const { error } = await supabase.from('rooms').delete().eq('id', roomToDelete.id);
      if (error) throw error;
      toast.success(t('deleted'));
      setRooms((prev) => prev.filter((r) => r.id !== roomToDelete.id));
      setDeleteDialogOpen(false);
      setRoomToDelete(null);
    } catch (err) {
      console.error('Delete room error:', err);
      toast.error(t('deleteFailed'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <DoorOpen className="size-4 text-primary" />
          {t('title')}
        </CardTitle>
        <CardDescription className="text-muted-foreground">{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {rooms.length > 0 ? (
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
                  >
                    <span className="text-sm text-foreground">{room.name}</span>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={room.is_active}
                        onCheckedChange={() => toggleActive(room)}
                        disabled={!canEdit}
                      />
                      <button
                        type="button"
                        onClick={() => confirmDelete(room)}
                        aria-label={t('deleteAria', { name: room.name })}
                        disabled={!canEdit}
                        className="rounded-full p-1 text-muted-foreground opacity-60 transition-opacity hover:bg-black/10 hover:opacity-100 disabled:pointer-events-none dark:hover:bg-white/10"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('empty')}</p>
            )}

            {canEdit && (
              <div className="flex flex-wrap items-center gap-2.5">
                <Input
                  placeholder={t('namePlaceholder')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                  }}
                  disabled={saving}
                  maxLength={60}
                  className="min-w-[180px] flex-1"
                />
                <Button variant="outline" size="sm" onClick={handleCreate} disabled={saving || !newName.trim()}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  {t('add')}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>
              {roomToDelete ? t('deleteConfirm', { name: roomToDelete.name }) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('deleting')}
                </>
              ) : (
                t('deleteTitle')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
