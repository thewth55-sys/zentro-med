'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Palette, Loader2 } from 'lucide-react';

import { useCan } from '@/hooks/use-can';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { BookingPageConfig } from '@/lib/scheduling/public-booking';

const DEFAULT_ACCENT = '#4ade5a';

/**
 * Editor "link-in-bio" de la página pública de reserva
 * (accounts.booking_page). Se monta detrás de PlanGate (booking_page,
 * Profesional+). Guarda el jsonb completo con un update sobre accounts
 * (RLS: accounts_update requiere admin). Portada/logo por URL (sin subida
 * de archivos) para no depender del bucket de media.
 */
export function BookingPageEditor() {
  const canEdit = useCan('edit-settings');
  const { accountId } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState<BookingPageConfig>({});

  useEffect(() => {
    if (!accountId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('accounts')
        .select('booking_page')
        .eq('id', accountId)
        .maybeSingle();
      if (!active) return;
      setPage((data?.booking_page as BookingPageConfig | null) ?? {});
      setLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  function setField<K extends keyof BookingPageConfig>(key: K, value: BookingPageConfig[K]) {
    setPage((prev) => ({ ...prev, [key]: value }));
  }
  function setContact(key: keyof NonNullable<BookingPageConfig['contact']>, value: string) {
    setPage((prev) => ({ ...prev, contact: { ...(prev.contact ?? {}), [key]: value || null } }));
  }
  function setSocial(key: keyof NonNullable<BookingPageConfig['social']>, value: string) {
    setPage((prev) => ({ ...prev, social: { ...(prev.social ?? {}), [key]: value || null } }));
  }

  async function handleSave() {
    if (!accountId) return;
    try {
      setSaving(true);
      const { error } = await supabase.from('accounts').update({ booking_page: page }).eq('id', accountId);
      if (error) throw error;
      toast.success('Página actualizada');
    } catch (err) {
      console.error('Save booking page error:', err);
      toast.error('No se pudo guardar la página');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Palette className="size-4 text-primary" />
          Personalización de la página
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Dale tu marca a la página de reserva (estilo link-in-bio): colores, portada, bio y botones
          de contacto y redes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Colores + portada */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Color de acento</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={page.accentColor || DEFAULT_ACCENT}
                    onChange={(e) => setField('accentColor', e.target.value)}
                    disabled={!canEdit}
                    className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                  />
                  <Input
                    value={page.accentColor ?? ''}
                    onChange={(e) => setField('accentColor', e.target.value || null)}
                    disabled={!canEdit}
                    placeholder={DEFAULT_ACCENT}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Color de portada</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={page.coverColor || page.accentColor || DEFAULT_ACCENT}
                    onChange={(e) => setField('coverColor', e.target.value)}
                    disabled={!canEdit}
                    className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                  />
                  <Input
                    value={page.coverColor ?? ''}
                    onChange={(e) => setField('coverColor', e.target.value || null)}
                    disabled={!canEdit}
                    placeholder="Igual que el acento"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Imagen de portada (URL)</Label>
                <Input
                  value={page.coverImageUrl ?? ''}
                  onChange={(e) => setField('coverImageUrl', e.target.value || null)}
                  disabled={!canEdit}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Logo (URL)</Label>
                <Input
                  value={page.logoUrl ?? ''}
                  onChange={(e) => setField('logoUrl', e.target.value || null)}
                  disabled={!canEdit}
                  placeholder="Por defecto: el logo de la cuenta"
                />
              </div>
            </div>

            {/* Textos */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input
                  value={page.headline ?? ''}
                  onChange={(e) => setField('headline', e.target.value || null)}
                  disabled={!canEdit}
                  placeholder="Por defecto: el nombre de la cuenta"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subtítulo</Label>
                <Input
                  value={page.tagline ?? ''}
                  onChange={(e) => setField('tagline', e.target.value || null)}
                  disabled={!canEdit}
                  placeholder="Ej. Especialistas en…"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Textarea
                value={page.bio ?? ''}
                onChange={(e) => setField('bio', e.target.value || null)}
                disabled={!canEdit}
                className="min-h-[70px]"
                placeholder="Una breve descripción de tu consultorio…"
              />
            </div>

            {/* Contacto */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Botones de contacto</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>WhatsApp</Label>
                  <Input value={page.contact?.whatsapp ?? ''} onChange={(e) => setContact('whatsapp', e.target.value)} disabled={!canEdit} placeholder="52 55 1234 5678" />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input value={page.contact?.phone ?? ''} onChange={(e) => setContact('phone', e.target.value)} disabled={!canEdit} placeholder="+52…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Correo</Label>
                  <Input value={page.contact?.email ?? ''} onChange={(e) => setContact('email', e.target.value)} disabled={!canEdit} placeholder="contacto@clinica.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Enlace de mapa</Label>
                  <Input value={page.contact?.mapUrl ?? ''} onChange={(e) => setContact('mapUrl', e.target.value)} disabled={!canEdit} placeholder="https://maps.google.com/…" />
                </div>
              </div>
            </div>

            {/* Redes */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Redes sociales</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Instagram</Label>
                  <Input value={page.social?.instagram ?? ''} onChange={(e) => setSocial('instagram', e.target.value)} disabled={!canEdit} placeholder="https://instagram.com/…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Facebook</Label>
                  <Input value={page.social?.facebook ?? ''} onChange={(e) => setSocial('facebook', e.target.value)} disabled={!canEdit} placeholder="https://facebook.com/…" />
                </div>
                <div className="space-y-1.5">
                  <Label>TikTok</Label>
                  <Input value={page.social?.tiktok ?? ''} onChange={(e) => setSocial('tiktok', e.target.value)} disabled={!canEdit} placeholder="https://tiktok.com/@…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Sitio web</Label>
                  <Input value={page.social?.web ?? ''} onChange={(e) => setSocial('web', e.target.value)} disabled={!canEdit} placeholder="https://…" />
                </div>
              </div>
            </div>

            {/* Bloques */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch checked={page.showServices !== false} onCheckedChange={(v) => setField('showServices', v)} disabled={!canEdit} />
                Mostrar tarjetas de servicios
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch checked={page.showAddress !== false} onCheckedChange={(v) => setField('showAddress', v)} disabled={!canEdit} />
                Mostrar la dirección
              </label>
            </div>

            {canEdit && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {saving ? 'Guardando…' : 'Guardar página'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
