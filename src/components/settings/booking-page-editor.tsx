'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Palette,
  Loader2,
  Upload,
  Image as ImageIcon,
  GripVertical,
  MessageCircle,
  CalendarCheck,
  Stethoscope,
  Share2,
  MapPin,
  Copy,
  ExternalLink,
  CalendarClock,
} from 'lucide-react';

import { useCan } from '@/hooks/use-can';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { uploadAccountMedia, MEDIA_MAX_BYTES_BY_KIND } from '@/lib/storage/upload-media';
import { getBusinessHoursStatus } from '@/lib/scheduling/business-hours';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BookingPageQrButton } from './booking-page-qr-button';
import { BookingPagePreview } from '@/components/public-booking/booking-page-preview';
import {
  DEFAULT_BOOKING_BLOCKS,
  resolveBookingBlocks,
  type BookingBlockConfig,
  type BookingBlockId,
  type BookingPageConfig,
} from '@/lib/scheduling/public-booking';

const DEFAULT_ACCENT = '#4ade5a';
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ACCENT_PRESETS = ['#16A34A', '#2563EB', '#7C3AED', '#DC2626', '#0F241A'];

const BLOCK_META: Record<BookingBlockId, { label: string; icon: typeof MessageCircle }> = {
  whatsapp: { label: 'Botón de WhatsApp', icon: MessageCircle },
  booking: { label: 'Agendar cita en línea', icon: CalendarCheck },
  services: { label: 'Tratamientos y precios', icon: Stethoscope },
  social: { label: 'Redes sociales', icon: Share2 },
  location: { label: 'Ubicación y contacto', icon: MapPin },
};

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

function SortableBlockRow({
  block,
  disabled,
  onToggle,
}: {
  block: BookingBlockConfig;
  disabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const meta = BLOCK_META[block.id];
  const Icon = meta.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2"
    >
      {!disabled && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Reordenar bloque"
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm text-foreground">{meta.label}</span>
      <Switch checked={block.enabled} onCheckedChange={onToggle} disabled={disabled} />
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

  // Datos de solo lectura para la vista previa + el toolbar — se
  // recargan tras cada guardado exitoso para que "vista previa" y
  // "publicado" nunca queden desincronizados.
  const [accountName, setAccountName] = useState('');
  const [accountLogoUrl, setAccountLogoUrl] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [serviceTypes, setServiceTypes] = useState<{ id: string; name: string; duration_minutes: number; price: number | null }[]>([]);
  const [businessHours, setBusinessHours] = useState<{ configured: boolean; open: boolean; closesAtLabel: string | null }>({
    configured: false,
    open: false,
    closesAtLabel: null,
  });
  const [appointmentsLast30d, setAppointmentsLast30d] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  useEffect(() => {
    if (!accountId) return;
    let active = true;
    (async () => {
      const thirtyDaysAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [accountRes, serviceTypesRes, hoursStatus, appointmentsRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('name, logo_url, address, booking_page, public_booking_slug, public_booking_enabled')
          .eq('id', accountId)
          .maybeSingle(),
        supabase
          .from('service_types')
          .select('id, name, duration_minutes, price')
          .eq('account_id', accountId)
          .eq('is_active', true)
          .order('name'),
        getBusinessHoursStatus(supabase, accountId),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', accountId)
          .eq('source', 'public_booking')
          .gte('created_at', thirtyDaysAgo),
      ]);
      if (!active) return;

      const account = accountRes.data;
      setPage((account?.booking_page as BookingPageConfig | null) ?? {});
      setAccountName(account?.name ?? '');
      setAccountLogoUrl(account?.logo_url ?? null);
      setAddress(account?.address ?? null);
      setServiceTypes(serviceTypesRes.data ?? []);
      setBusinessHours(hoursStatus);
      setAppointmentsLast30d(appointmentsRes.count ?? 0);

      const bookingBaseUrl = process.env.NEXT_PUBLIC_BOOKING_URL?.replace(/\/+$/, '');
      const slug = account?.public_booking_slug;
      setPublicUrl(
        !slug || !account?.public_booking_enabled
          ? null
          : bookingBaseUrl
            ? `${bookingBaseUrl}/${slug}`
            : `${window.location.origin}/agendar/${slug}`,
      );

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

  const blocks = resolveBookingBlocks(page);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setField('blocks', arrayMove(blocks, oldIndex, newIndex));
  }

  function toggleBlock(id: BookingBlockId, enabled: boolean) {
    setField(
      'blocks',
      blocks.map((b) => (b.id === id ? { ...b, enabled } : b)),
    );
  }

  async function handleSave() {
    if (!accountId) return;
    try {
      setSaving(true);
      // Si el usuario nunca tocó el orden de bloques, se guarda el
      // orden por defecto explícitamente — así queda fijo y deja de
      // depender de los flags legacy showServices/showAddress.
      const toSave: BookingPageConfig = { ...page, blocks: page.blocks ?? DEFAULT_BOOKING_BLOCKS };
      const { data, error } = await supabase
        .from('accounts')
        .update({ booking_page: toSave })
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="outline">Vista del paciente</Badge>
          {publicUrl ? (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="truncate text-sm text-muted-foreground hover:text-primary hover:underline">
              {publicUrl.replace(/^https?:\/\//, '')}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">Activa tu página arriba para obtener un enlace</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {publicUrl && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  toast.success('Enlace copiado');
                }}
              >
                <Copy className="size-4" />
                Copiar enlace
              </Button>
              <BookingPageQrButton url={publicUrl} />
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <Button type="button" variant="ghost" size="icon" aria-label="Abrir página">
                  <ExternalLink className="size-4" />
                </Button>
              </a>
            </>
          )}
          {canEdit && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* Columna de edición */}
        <div className="space-y-4">
          {/* Bloques */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <GripVertical className="size-4 text-primary" />
                Bloques
              </CardTitle>
              <CardDescription>Arrastra para reordenar lo que ve el paciente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2 opacity-80">
                <div className="size-4 shrink-0" />
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm text-foreground">Portada y perfil</span>
                <Switch checked disabled />
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {blocks.map((block) => (
                      <SortableBlockRow
                        key={block.id}
                        block={block}
                        disabled={!canEdit}
                        onToggle={(enabled) => toggleBlock(block.id, enabled)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>

          {/* Apariencia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Palette className="size-4 text-primary" />
                Apariencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Color de acento</Label>
                <div className="flex items-center gap-2">
                  {ACCENT_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setField('accentColor', c)}
                      aria-label={`Usar ${c}`}
                      className="size-8 shrink-0 rounded-full border-2 transition-transform hover:scale-110 disabled:pointer-events-none disabled:opacity-60"
                      style={{
                        backgroundColor: c,
                        borderColor: (page.accentColor || DEFAULT_ACCENT).toLowerCase() === c.toLowerCase() ? c : 'transparent',
                        outline: (page.accentColor || DEFAULT_ACCENT).toLowerCase() === c.toLowerCase() ? '2px solid var(--ring)' : undefined,
                      }}
                    />
                  ))}
                  <Input
                    value={page.accentColor ?? ''}
                    onChange={(e) => setField('accentColor', e.target.value || null)}
                    onBlur={(e) => {
                      if (e.target.value) setField('accentColor', normalizeHex(e.target.value));
                    }}
                    disabled={!canEdit}
                    placeholder={DEFAULT_ACCENT}
                    className="ml-1 w-24 text-xs"
                  />
                </div>
              </div>
              <ImageUploadField
                label="Portada"
                value={page.coverImageUrl}
                onChange={(url) => setField('coverImageUrl', url)}
                disabled={!canEdit}
                placeholder="https://… (o sube un archivo)"
              />
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
                label="Logo"
                value={page.logoUrl}
                onChange={(url) => setField('logoUrl', url)}
                disabled={!canEdit}
                placeholder="Por defecto: el logo de la cuenta"
              />
            </CardContent>
          </Card>

          {/* Contenido */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Contenido</CardTitle>
              <CardDescription>Título, bio y botones de contacto y redes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        </div>

        {/* Vista previa */}
        <div className="space-y-4">
          {appointmentsLast30d !== null && (
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                  <CalendarClock className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-foreground">{appointmentsLast30d}</p>
                  <p className="text-xs text-muted-foreground">Citas agendadas desde esta página · últimos 30 días</p>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex justify-center rounded-2xl bg-muted/40 p-6">
            <BookingPagePreview
              page={page}
              accountName={accountName}
              accountLogoUrl={accountLogoUrl}
              address={address}
              serviceTypes={serviceTypes}
              businessHours={businessHours}
              interactive={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
