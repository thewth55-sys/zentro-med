'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Palette, Loader2, Upload, Image as ImageIcon } from 'lucide-react';

import { useCan } from '@/hooks/use-can';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { uploadAccountMedia, MEDIA_MAX_BYTES_BY_KIND } from '@/lib/storage/upload-media';
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
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Best-effort normalization so a hand-typed value like "4ade5a" or
 *  " #4ADE5A " still lands as a valid 6-digit hex the native color
 *  swatch can render — invalid/partial input is left untouched. */
function normalizeHex(raw: string): string {
  const trimmed = raw.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return HEX_COLOR_RE.test(withHash) ? withHash.toLowerCase() : trimmed;
}

/** Inline uploader for the cover/logo images — lets the clinic pick a
 *  file (uploaded to the same public `chat-media` bucket the account
 *  logo already uses) or, as before, paste an external URL directly. */
function ImageUploadField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  disabled: boolean;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Usa una imagen PNG, JPEG o WebP');
      return;
    }
    if (file.size > MEDIA_MAX_BYTES_BY_KIND.image) {
      toast.error('La imagen debe pesar 5 MB o menos');
      return;
    }
    setUploading(true);
    try {
      const { publicUrl } = await uploadAccountMedia('chat-media', file);
      onChange(publicUrl);
    } catch (err) {
      console.error('Booking page image upload error:', err);
      toast.error(err instanceof Error ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- account-controlled upload, arbitrary remote host
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              {value ? 'Cambiar' : 'Subir imagen'}
            </Button>
            {value ? (
              <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(null)}>
                Quitar
              </Button>
            ) : null}
          </div>
          <Input
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            placeholder={placeholder}
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Editor "link-in-bio" de la página pública de reserva
 * (accounts.booking_page). Se monta detrás de PlanGate (booking_page,
 * Profesional+). Guarda el jsonb completo con un update sobre accounts
 * (RLS: accounts_update requiere admin) y vuelve a leer la fila
 * devuelta por el propio update en vez de confiar en el estado local
 * — así un update bloqueado por RLS (0 filas, sin error) se ve como
 * error en vez de un falso "guardado" que luego revierte al refrescar.
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
      const { data, error } = await supabase
        .from('accounts')
        .update({ booking_page: page })
        .eq('id', accountId)
        .select('booking_page')
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Postgrest doesn't error on an UPDATE that RLS silently
        // narrows to 0 rows — without this check the toast below
        // would claim success while nothing was actually persisted.
        throw new Error('No se guardó ningún cambio — verifica que tengas permisos de administrador.');
      }
      setPage((data.booking_page as BookingPageConfig | null) ?? {});
      toast.success('Página actualizada');
    } catch (err) {
      console.error('Save booking page error:', err);
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la página');
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
                    value={HEX_COLOR_RE.test(page.accentColor || '') ? (page.accentColor as string) : DEFAULT_ACCENT}
                    onChange={(e) => setField('accentColor', e.target.value)}
                    disabled={!canEdit}
                    className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                  />
                  <Input
                    value={page.accentColor ?? ''}
                    onChange={(e) => setField('accentColor', e.target.value || null)}
                    onBlur={(e) => {
                      if (e.target.value) setField('accentColor', normalizeHex(e.target.value));
                    }}
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
                    value={
                      HEX_COLOR_RE.test(page.coverColor || '')
                        ? (page.coverColor as string)
                        : HEX_COLOR_RE.test(page.accentColor || '')
                          ? (page.accentColor as string)
                          : DEFAULT_ACCENT
                    }
                    onChange={(e) => setField('coverColor', e.target.value)}
                    disabled={!canEdit}
                    className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                  />
                  <Input
                    value={page.coverColor ?? ''}
                    onChange={(e) => setField('coverColor', e.target.value || null)}
                    onBlur={(e) => {
                      if (e.target.value) setField('coverColor', normalizeHex(e.target.value));
                    }}
                    disabled={!canEdit}
                    placeholder="Igual que el acento"
                  />
                </div>
              </div>
              <ImageUploadField
                label="Imagen de portada"
                value={page.coverImageUrl}
                onChange={(url) => setField('coverImageUrl', url)}
                disabled={!canEdit}
                placeholder="https://… (o sube un archivo)"
              />
              <ImageUploadField
                label="Logo"
                value={page.logoUrl}
                onChange={(url) => setField('logoUrl', url)}
                disabled={!canEdit}
                placeholder="Por defecto: el logo de la cuenta"
              />
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
