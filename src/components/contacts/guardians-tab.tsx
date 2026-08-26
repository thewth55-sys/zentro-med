'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, UserRound } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GuardianLink {
  id: string; // patient_guardians.id
  relationship: string | null;
  is_primary: boolean;
  guardian: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
}

/**
 * Responsables / tutores de un paciente. Para pacientes pediátricos (o el
 * dueño en veterinaria) — registra a la persona responsable con sus datos
 * de contacto y su parentesco. La entidad guardian es reutilizable entre
 * varios pacientes (aquí, al agregar, se crea uno nuevo y se enlaza).
 */
export function GuardiansTab({ contactId }: { contactId: string }) {
  const { accountId } = useAuth();
  const supabase = createClient();

  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('patient_guardians')
      .select('id, relationship, is_primary, guardian:guardians(id, name, phone, email)')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true });
    setLinks((data ?? []) as unknown as GuardianLink[]);
    setLoading(false);
  }, [supabase, contactId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    if (!accountId) return;
    if (!name.trim()) {
      toast.error('El nombre del responsable es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const { data: guardian, error: gErr } = await supabase
        .from('guardians')
        .insert({
          account_id: accountId,
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
        })
        .select('id')
        .single();
      if (gErr || !guardian) throw gErr ?? new Error('insert failed');

      const { error: linkErr } = await supabase.from('patient_guardians').insert({
        account_id: accountId,
        contact_id: contactId,
        guardian_id: guardian.id,
        relationship: relationship.trim() || null,
        is_primary: links.length === 0,
      });
      if (linkErr) throw linkErr;

      toast.success('Responsable agregado');
      setName('');
      setRelationship('');
      setPhone('');
      setEmail('');
      void load();
    } catch (err) {
      console.error('Add guardian error:', err);
      toast.error('No se pudo agregar el responsable');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(linkId: string) {
    const { error } = await supabase.from('patient_guardians').delete().eq('id', linkId);
    if (error) {
      toast.error('No se pudo quitar el responsable');
      return;
    }
    void load();
  }

  return (
    <div className="space-y-5">
      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este paciente aún no tiene un responsable o tutor registrado.
        </p>
      ) : (
        <div className="space-y-2">
          {links.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <UserRound className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {l.guardian?.name ?? '—'}
                    {l.is_primary ? (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">Principal</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[l.relationship, l.guardian?.phone, l.guardian?.email].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(l.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Quitar responsable"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Agregar */}
      <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
        <p className="text-sm font-medium text-foreground">Agregar responsable</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del tutor/responsable" />
          </div>
          <div className="space-y-1.5">
            <Label>Parentesco</Label>
            <Input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Madre, padre, tutor, dueño…" />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-1.5">
            <Label>Correo</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAdd} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}
