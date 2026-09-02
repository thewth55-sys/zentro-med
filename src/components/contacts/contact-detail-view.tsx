'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';
import type { Contact, Tag, ContactNote, CustomField, Deal, MessageTemplate } from '@/types';
import {
  TemplatePicker,
  type TemplateSendValues,
} from '@/components/inbox/template-picker';
import { MedicalTab } from '@/components/contacts/medical-tab';
import { IntakeTab } from '@/components/contacts/intake-tab';
import { GuardiansTab } from '@/components/contacts/guardians-tab';
import { ConsentFormsTab } from '@/components/contacts/consent-forms-tab';
import { OdontogramTab } from '@/components/contacts/odontogram-tab';
import { VisitPhotosTab } from '@/components/contacts/visit-photos-tab';
import { AppointmentsTab } from '@/components/contacts/appointments-tab';
import { BillingTab } from '@/components/contacts/billing-tab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Phone,
  Mail,
  Building2,
  Copy,
  Check,
  Loader2,
  Plus,
  Trash2,
  Save,
  Pencil,
  DollarSign,
  LayoutTemplate,
  AlertTriangle,
  Wallet,
  Users,
  StickyNote,
  Stethoscope,
  FileSignature,
  Smile,
  ClipboardList,
  Image as ImageIcon,
  CalendarClock,
  Receipt,
  Settings2,
  Handshake,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { showsOdontogram } from '@/lib/specialties';

interface ContactDetailViewProps {
  contactId: string;
}

/**
 * Los antiguos 13 tabs planos (details/tags/notes/medical/intake/
 * guardians/consent/odontogram/photos/appointments/billing/custom/
 * deals) se agrupan en 3 — Clínico / Financiero / Documentos — por el
 * mismo motivo que el sidebar se agrupó en la fase 2: "qué le falta y
 * cuánto debe" ya no debería requerir abrir tres vistas distintas.
 * `details` y `tags` salen del todo de la barra de pestañas — viven en
 * el encabezado fijo (ver abajo) en vez de competir por espacio con el
 * contenido clínico/financiero.
 */
const TAB_GROUPS = [
  {
    key: 'clinico',
    labelKey: 'groupClinico',
    icon: Stethoscope,
    children: [
      { key: 'medical', labelKey: 'tabs.medical', icon: Stethoscope, requiresOdontogram: false },
      { key: 'odontogram', labelKey: 'tabs.odontogram', icon: Smile, requiresOdontogram: true },
      { key: 'appointments', labelKey: 'tabs.appointments', icon: CalendarClock, requiresOdontogram: false },
      { key: 'notes', labelKey: 'tabs.notes', icon: StickyNote, requiresOdontogram: false },
      { key: 'guardians', labelKey: 'tabs.guardians', icon: Users, requiresOdontogram: false },
      { key: 'intake', labelKey: 'tabs.intake', icon: ClipboardList, requiresOdontogram: false },
    ],
  },
  {
    key: 'financiero',
    labelKey: 'groupFinanciero',
    icon: Receipt,
    children: [
      { key: 'billing', labelKey: 'tabs.billing', icon: Receipt, requiresOdontogram: false },
      { key: 'deals', labelKey: 'tabs.deals', icon: Handshake, requiresOdontogram: false },
    ],
  },
  {
    key: 'documentos',
    labelKey: 'groupDocumentos',
    icon: ImageIcon,
    children: [
      { key: 'consent', labelKey: 'tabs.consent', icon: FileSignature, requiresOdontogram: false },
      { key: 'photos', labelKey: 'tabs.photos', icon: ImageIcon, requiresOdontogram: false },
      { key: 'custom', labelKey: 'tabs.custom', icon: Settings2, requiresOdontogram: false },
    ],
  },
] as const;

type ChildKey = (typeof TAB_GROUPS)[number]['children'][number]['key'];

/** Which group a child tab key lives in — for deep-linking `?tab=<child>`
 *  straight to the right group + sub-tab (backward compatible with any
 *  existing link that points at a specific former top-level tab). */
function findGroupForChild(childKey: string | null): { groupKey: string; childKey: ChildKey } {
  for (const group of TAB_GROUPS) {
    const child = group.children.find((c) => c.key === childKey);
    if (child) return { groupKey: group.key, childKey: child.key };
  }
  return { groupKey: TAB_GROUPS[0].key, childKey: TAB_GROUPS[0].children[0].key };
}

interface NextAppointmentSummary {
  start_at: string;
  doctor?: { name: string } | { name: string }[] | null;
  service_type?: { name: string } | { name: string }[] | null;
}

const nextAppointmentTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function ContactDetailView({ contactId }: ContactDetailViewProps) {
  const t = useTranslations('Contacts.detailView');
  const supabase = createClient();
  const { accountId, defaultCurrency, account } = useAuth();
  const showOdontogram = showsOdontogram(account?.specialty);
  const searchParams = useSearchParams();
  const { groupKey: initialGroup, childKey: initialChild } = findGroupForChild(searchParams.get('tab'));

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Send template — lets the business initiate (or re-open) a conversation
  // with this contact by sending an approved template. The send route
  // find-or-creates the conversation, so no inbound message is required.
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState(false);

  // Editar contacto — antes era la pestaña "details", ahora vive en un
  // diálogo lanzado desde el encabezado fijo.
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editLandlinePhone, setEditLandlinePhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLeadSource, setEditLeadSource] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // Tags — antes pestaña propia, ahora pills en el encabezado.
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [contactTagIds, setContactTagIds] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);

  // Encabezado fijo: alergia, saldo, próxima cita — "el dato que evita
  // daño clínico se ve primero", sin tablas/rutas nuevas: se reutilizan
  // patient_profiles y las mismas rutas que ya usan MedicalTab/BillingTab/
  // AppointmentsTab, solo se agregan y muestran arriba.
  const [patientAllergies, setPatientAllergies] = useState<string | null>(null);
  const [balanceOwed, setBalanceOwed] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [nextAppointment, setNextAppointment] = useState<NextAppointmentSummary | null>(null);
  const [nextAppointmentLoading, setNextAppointmentLoading] = useState(true);

  // Notes tab
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Custom fields tab
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [savingCustom, setSavingCustom] = useState(false);
  const [loadingCustom, setLoadingCustom] = useState(false);

  // Deals tab
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);

  const fetchContact = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);

    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (data) {
      setContact(data);
      // Contacts created before first_name/last_name existed only have
      // `name` — best-effort split it (first word → Nombres, rest →
      // Apellidos) purely to pre-fill the form; nothing is written back
      // until the admin hits "Guardar cambios".
      if (data.first_name || data.last_name) {
        setEditFirstName(data.first_name ?? '');
        setEditLastName(data.last_name ?? '');
      } else {
        const parts = (data.name ?? '').trim().split(/\s+/).filter(Boolean);
        setEditFirstName(parts[0] ?? '');
        setEditLastName(parts.slice(1).join(' '));
      }
      setEditNickname(data.nickname ?? '');
      setEditPhone(data.phone);
      setEditEmail(data.email ?? '');
      setEditCompany(data.company ?? '');
      setEditLandlinePhone(data.landline_phone ?? '');
      setEditAddress(data.address ?? '');
      setEditLeadSource(data.lead_source ?? '');
    }
    setLoading(false);
  }, [contactId, supabase]);

  const fetchTags = useCallback(async () => {
    if (!contactId) return;

    const [tagsRes, contactTagsRes] = await Promise.all([
      supabase.from('tags').select('*').order('name'),
      supabase.from('contact_tags').select('tag_id').eq('contact_id', contactId),
    ]);

    if (tagsRes.data) setAllTags(tagsRes.data);
    if (contactTagsRes.data) {
      setContactTagIds(contactTagsRes.data.map((ct) => ct.tag_id));
    }
  }, [contactId, supabase]);

  // Alergia — misma tabla que MedicalTab, un select mínimo aparte para
  // que el encabezado no tenga que esperar/montar todo MedicalTab.
  const fetchAllergies = useCallback(async () => {
    if (!contactId) return;
    const { data } = await supabase
      .from('patient_profiles')
      .select('allergies')
      .eq('contact_id', contactId)
      .maybeSingle();
    setPatientAllergies(data?.allergies ?? null);
  }, [contactId, supabase]);

  // Saldo — reutiliza /api/billing/invoices (la misma ruta que ya usa
  // InvoiceList dentro de BillingTab), solo se suma total-amount_paid
  // sobre facturas no draft/void. Sin ruta ni agregado nuevo en el
  // servidor.
  const fetchBalance = useCallback(async () => {
    if (!contactId) return;
    setBalanceLoading(true);
    try {
      const res = await fetch(`/api/billing/invoices?contact_id=${contactId}`);
      const json = await res.json();
      const invoices = (json.invoices ?? []) as Array<{
        status: string;
        total: number | string;
        amount_paid: number | string;
      }>;
      const owed = invoices
        .filter((inv) => inv.status !== 'draft' && inv.status !== 'void')
        .reduce((sum, inv) => sum + (Number(inv.total) - Number(inv.amount_paid)), 0);
      setBalanceOwed(owed);
    } catch {
      setBalanceOwed(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [contactId]);

  // Próxima cita — reutiliza /api/appointments (la misma ruta que ya usa
  // AppointmentsTab, ya viene ordenada start_at ascendente); se toma en
  // el cliente la primera con start_at futuro y no cancelada.
  const fetchNextAppointment = useCallback(async () => {
    if (!contactId) return;
    setNextAppointmentLoading(true);
    try {
      const res = await fetch(`/api/appointments?contact_id=${contactId}`);
      const json = await res.json();
      const appointments = (json.appointments ?? []) as Array<NextAppointmentSummary & { status: string }>;
      const now = Date.now();
      const next =
        appointments.find((a) => a.status !== 'cancelled' && new Date(a.start_at).getTime() >= now) ?? null;
      setNextAppointment(next);
    } catch {
      setNextAppointment(null);
    } finally {
      setNextAppointmentLoading(false);
    }
  }, [contactId]);

  const fetchNotes = useCallback(async () => {
    if (!contactId) return;
    setLoadingNotes(true);

    const { data } = await supabase
      .from('contact_notes')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (data) setNotes(data);
    setLoadingNotes(false);
  }, [contactId, supabase]);

  const fetchCustomFields = useCallback(async () => {
    if (!contactId) return;
    setLoadingCustom(true);

    const [fieldsRes, valuesRes] = await Promise.all([
      supabase.from('custom_fields').select('*').order('field_name'),
      supabase
        .from('contact_custom_values')
        .select('*')
        .eq('contact_id', contactId),
    ]);

    if (fieldsRes.data) setCustomFields(fieldsRes.data);
    if (valuesRes.data) {
      const map: Record<string, string> = {};
      valuesRes.data.forEach((v) => {
        map[v.custom_field_id] = v.value ?? '';
      });
      setCustomValues(map);
    }
    setLoadingCustom(false);
  }, [contactId, supabase]);

  const fetchDeals = useCallback(async () => {
    if (!contactId) return;
    setLoadingDeals(true);
    const { data } = await supabase
      .from('deals')
      .select('*, stage:pipeline_stages(*)')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    setDeals((data ?? []) as Deal[]);
    setLoadingDeals(false);
  }, [contactId, supabase]);

  useEffect(() => {
    if (contactId) {
      fetchContact();
      fetchTags();
      fetchAllergies();
      fetchBalance();
      fetchNextAppointment();
      fetchNotes();
      fetchCustomFields();
      fetchDeals();
    }
  }, [
    contactId,
    fetchContact,
    fetchTags,
    fetchAllergies,
    fetchBalance,
    fetchNextAppointment,
    fetchNotes,
    fetchCustomFields,
    fetchDeals,
  ]);

  async function copyPhone() {
    if (!contact) return;
    await navigator.clipboard.writeText(contact.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  }

  async function saveDetails() {
    if (!contactId || !editPhone.trim()) {
      toast.error(t('toastPhoneRequired'));
      return;
    }

    setSavingDetails(true);
    const { error } = await supabase
      .from('contacts')
      .update({
        first_name: editFirstName.trim() || null,
        last_name: editLastName.trim() || null,
        nickname: editNickname.trim() || null,
        phone: editPhone.trim(),
        email: editEmail.trim() || null,
        company: editCompany.trim() || null,
        landline_phone: editLandlinePhone.trim() || null,
        address: editAddress.trim() || null,
        lead_source: editLeadSource || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId);

    if (error) {
      toast.error(t('toastUpdateFailed'));
    } else {
      toast.success(t('toastUpdated'));
      fetchContact();
      setEditContactOpen(false);
    }
    setSavingDetails(false);
  }

  async function toggleTag(tagId: string) {
    if (!contactId) return;
    setSavingTags(true);

    const isSelected = contactTagIds.includes(tagId);

    if (isSelected) {
      const { error } = await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', contactId)
        .eq('tag_id', tagId);
      if (!error) {
        setContactTagIds((prev) => prev.filter((id) => id !== tagId));
      }
    } else {
      const { error } = await supabase
        .from('contact_tags')
        .insert({ contact_id: contactId, tag_id: tagId });
      if (!error) {
        setContactTagIds((prev) => [...prev, tagId]);
      }
    }
    setSavingTags(false);
  }

  async function addNote() {
    if (!contactId || !newNote.trim()) return;
    setSavingNote(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user || !accountId) {
      toast.error(t('toastNotAuthenticated'));
      setSavingNote(false);
      return;
    }

    const { error } = await supabase.from('contact_notes').insert({
      contact_id: contactId,
      account_id: accountId,
      user_id: user.id,
      note_text: newNote.trim(),
    });

    if (error) {
      toast.error(t('toastNoteAddFailed'));
    } else {
      setNewNote('');
      fetchNotes();
      toast.success(t('toastNoteAdded'));
    }
    setSavingNote(false);
  }

  async function deleteNote(noteId: string) {
    const { error } = await supabase
      .from('contact_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      toast.error(t('toastNoteDeleteFailed'));
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success(t('toastNoteDeleted'));
    }
  }

  async function saveCustomFields() {
    if (!contactId) return;
    setSavingCustom(true);

    try {
      // Delete existing values and re-insert
      await supabase
        .from('contact_custom_values')
        .delete()
        .eq('contact_id', contactId);

      const rows = Object.entries(customValues)
        .filter(([, val]) => val.trim())
        .map(([fieldId, val]) => ({
          contact_id: contactId,
          custom_field_id: fieldId,
          value: val.trim(),
        }));

      if (rows.length > 0) {
        const { error } = await supabase
          .from('contact_custom_values')
          .insert(rows);
        if (error) throw error;
      }

      toast.success(t('toastCustomFieldsSaved'));
    } catch {
      toast.error(t('toastCustomFieldsFailed'));
    }
    setSavingCustom(false);
  }

  async function handleSendTemplate(
    template: MessageTemplate,
    values: TemplateSendValues,
  ) {
    if (!contactId) return;
    setSendingTemplate(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // No conversation_id — the route find-or-creates one for this
          // contact, mirroring the inbox template-send payload otherwise.
          contact_id: contactId,
          message_type: 'template',
          template_name: template.name,
          template_language: template.language,
          template_message_params: {
            body: values.body,
            headerText: values.headerText,
            buttonParams: values.buttonParams,
          },
          template_params: values.body,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const reason = payload?.error || `HTTP ${res.status}`;
        toast.error(t('toastTemplateFailed', { reason }));
        return;
      }

      toast.success(t('toastTemplateSent', { name: template.name }));
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'network error';
      toast.error(`Failed to send template: ${reason}`);
    } finally {
      setSendingTemplate(false);
    }
  }

  function getInitials(name?: string | null) {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function relationName(rel: { name: string } | { name: string }[] | null | undefined): string | null {
    if (!rel) return null;
    return Array.isArray(rel) ? (rel[0]?.name ?? null) : rel.name;
  }

  return (
    <>
    <div className="rounded-lg border border-border bg-popover text-popover-foreground">
        {loading || !contact ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <Avatar className="size-12 bg-muted border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-popover-foreground truncate">
                      {contact.name || t('unnamed')}
                    </h1>
                    <button
                      type="button"
                      onClick={() => setEditContactOpen(true)}
                      aria-label={t('editContactBtn')}
                      title={t('editContactBtn')}
                      className="shrink-0 rounded-full p-1 text-muted-foreground opacity-60 transition-opacity hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <button
                      onClick={copyPhone}
                      className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                    >
                      <Phone className="size-3" />
                      {contact.phone}
                      {copiedPhone ? (
                        <Check className="size-3 text-primary" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="size-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3" />
                        {contact.company}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Datos que evitan daño clínico o sorpresas administrativas
                  se leen aquí, sin abrir ninguna pestaña — alergia, saldo,
                  próxima cita. Mismo patrón de "pill" que ya usa
                  dashboard-hero.tsx. */}
              <div className="mt-3 flex flex-wrap gap-2">
                {patientAllergies && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5">
                    <AlertTriangle className="size-3.5 shrink-0 text-red-400" />
                    <div className="leading-tight">
                      <p className="text-[10px] font-medium text-red-400/80 uppercase tracking-wide">
                        {t('allergyLabel')}
                      </p>
                      <p className="text-xs font-medium text-foreground">{patientAllergies}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
                  <Wallet className="size-3.5 shrink-0 text-muted-foreground" />
                  <div className="leading-tight">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      {t('balanceLabel')}
                    </p>
                    <p className="text-xs font-medium text-foreground">
                      {balanceLoading ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : balanceOwed && balanceOwed > 0 ? (
                        formatCurrency(balanceOwed, defaultCurrency)
                      ) : (
                        t('balanceNone')
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
                  <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" />
                  <div className="leading-tight">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      {t('nextAppointmentLabel')}
                    </p>
                    <p className="text-xs font-medium text-foreground">
                      {nextAppointmentLoading ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : nextAppointment ? (
                        <>
                          {nextAppointmentTimeFormatter.format(new Date(nextAppointment.start_at))}
                          {relationName(nextAppointment.doctor) || relationName(nextAppointment.service_type) ? (
                            <span className="text-muted-foreground">
                              {' · '}
                              {[relationName(nextAppointment.doctor), relationName(nextAppointment.service_type)]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        t('noNextAppointment')
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tags — antes pestaña propia, ahora pills junto al resto de
                  los datos rápidos del encabezado. */}
              {allTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {allTags.map((tag) => {
                    const selected = contactTagIds.includes(tag.id);
                    if (!selected) return null;
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        disabled={savingTags}
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80"
                        style={{ backgroundColor: tag.color + '20', color: tag.color }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={() => setTemplatePickerOpen(true)}
                  disabled={sendingTemplate}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {sendingTemplate ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LayoutTemplate className="size-4" />
                  )}
                  {t('sendTemplateBtn')}
                </Button>
              </div>
            </div>

            {/* Tres grupos — Clínico / Financiero / Documentos — cada uno
                con sus hijos como una segunda barra de pestañas más chica,
                en vez de 11 pestañas planas al mismo peso. Ningún
                sub-componente se reescribe, solo cambia cómo se navega a
                ellos (mismo principio que el sidebar agrupado). */}
            <Tabs defaultValue={initialGroup} className="flex flex-col">
              <div className="mx-4 mt-3">
                <TabsList
                  variant="line"
                  className="group-data-horizontal/tabs:h-auto w-full flex-wrap justify-start gap-1 border-b border-border"
                >
                  {TAB_GROUPS.map((group) => (
                    <TabsTrigger
                      key={group.key}
                      value={group.key}
                      className="h-auto shrink-0 gap-1.5 px-3 py-2.5 text-muted-foreground data-active:text-primary"
                    >
                      <group.icon className="size-4" />
                      {t(group.labelKey)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {TAB_GROUPS.map((group) => {
                const visibleChildren = group.children.filter((c) => !c.requiresOdontogram || showOdontogram);
                const groupInitialChild = visibleChildren.some((c) => c.key === initialChild)
                  ? initialChild
                  : visibleChildren[0]?.key;
                return (
                  <TabsContent key={group.key} value={group.key} className="px-4 py-3">
                    <Tabs defaultValue={groupInitialChild}>
                      <TabsList
                        variant="line"
                        className="group-data-horizontal/tabs:h-auto mb-3 w-full flex-wrap justify-start gap-1 border-b border-border/60"
                      >
                        {visibleChildren.map((child) => (
                          <TabsTrigger
                            key={child.key}
                            value={child.key}
                            className="h-auto shrink-0 gap-1.5 px-2.5 py-2 text-xs text-muted-foreground data-active:text-primary"
                          >
                            <child.icon className="size-3.5" />
                            {t(child.labelKey)}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {/* Clínico */}
                      {group.key === 'clinico' && (
                        <>
                          <TabsContent value="medical">
                            {contactId && <MedicalTab contactId={contactId} />}
                          </TabsContent>
                          {showOdontogram && (
                            <TabsContent value="odontogram">
                              {contactId && <OdontogramTab contactId={contactId} />}
                            </TabsContent>
                          )}
                          <TabsContent value="appointments">
                            {contactId && <AppointmentsTab contactId={contactId} />}
                          </TabsContent>
                          <TabsContent value="notes">
                            <div className="space-y-2 mb-3">
                              <Textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder={t('notesTab.placeholder')}
                                className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[60px] text-sm resize-none"
                              />
                              <Button
                                onClick={addNote}
                                disabled={!newNote.trim() || savingNote}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                size="sm"
                              >
                                {savingNote ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Plus className="size-3.5" />
                                )}
                                {t('notesTab.save')}
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {loadingNotes ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                                </div>
                              ) : notes.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                  {t('notesTab.noNotes')}
                                </p>
                              ) : (
                                notes.map((note) => (
                                  <div
                                    key={note.id}
                                    className="rounded-lg bg-muted/50 border border-border/50 p-3 group"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap flex-1">
                                        {note.note_text}
                                      </p>
                                      <button
                                        onClick={() => deleteNote(note.id)}
                                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all cursor-pointer shrink-0"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1.5">
                                      {new Date(note.created_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          </TabsContent>
                          <TabsContent value="guardians">
                            {contactId && <GuardiansTab contactId={contactId} />}
                          </TabsContent>
                          <TabsContent value="intake">
                            {contactId && <IntakeTab contactId={contactId} />}
                          </TabsContent>
                        </>
                      )}

                      {/* Financiero */}
                      {group.key === 'financiero' && (
                        <>
                          <TabsContent value="billing">
                            {contactId && <BillingTab contactId={contactId} />}
                          </TabsContent>
                          <TabsContent value="deals">
                            {loadingDeals ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="size-5 animate-spin text-primary" />
                              </div>
                            ) : deals.length === 0 ? (
                              <p className="text-xs text-muted-foreground">{t('dealsTab.noDeals')}</p>
                            ) : (
                              <div className="space-y-2">
                                {deals.map((deal) => (
                                  <div
                                    key={deal.id}
                                    className="rounded-lg border border-border bg-muted/50 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm font-medium text-foreground">
                                        {deal.title}
                                      </p>
                                      {deal.stage && (
                                        <span
                                          className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                          style={{
                                            backgroundColor: `${deal.stage.color}20`,
                                            color: deal.stage.color,
                                          }}
                                        >
                                          {deal.stage.name}
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <DollarSign className="size-3" />
                                        {formatCurrency(
                                          deal.value ?? 0,
                                          deal.currency || defaultCurrency,
                                        )}
                                      </span>
                                      {deal.status && deal.status !== 'open' && (
                                        <span
                                          className={
                                            deal.status === 'won'
                                              ? 'text-primary'
                                              : 'text-red-400'
                                          }
                                        >
                                          {deal.status}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>
                        </>
                      )}

                      {/* Documentos */}
                      {group.key === 'documentos' && (
                        <>
                          <TabsContent value="consent">
                            {contactId && <ConsentFormsTab contactId={contactId} />}
                          </TabsContent>
                          <TabsContent value="photos">
                            {contactId && <VisitPhotosTab contactId={contactId} />}
                          </TabsContent>
                          <TabsContent value="custom">
                            {loadingCustom ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                              </div>
                            ) : customFields.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-8">
                                {t('noCustomFields')}
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {customFields.map((field) => (
                                  <div key={field.id} className="space-y-1.5">
                                    <Label className="text-muted-foreground text-xs capitalize">
                                      {field.field_name}
                                    </Label>
                                    <Input
                                      value={customValues[field.id] ?? ''}
                                      onChange={(e) =>
                                        setCustomValues((prev) => ({
                                          ...prev,
                                          [field.id]: e.target.value,
                                        }))
                                      }
                                      placeholder={t('enterCustomField', { name: field.field_name })}
                                      className="bg-muted border-border text-foreground h-8 text-sm placeholder:text-muted-foreground"
                                    />
                                  </div>
                                ))}
                                <Button
                                  onClick={saveCustomFields}
                                  disabled={savingCustom}
                                  className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                                  size="sm"
                                >
                                  {savingCustom ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Save className="size-3.5" />
                                  )}
                                  {t('saveCustomFieldsBtn')}
                                </Button>
                              </div>
                            )}
                          </TabsContent>
                        </>
                      )}
                    </Tabs>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        )}
    </div>

    {/* Editar contacto — antes la pestaña "details", ahora un diálogo
        lanzado desde el lápiz junto al nombre en el encabezado. */}
    <Dialog open={editContactOpen} onOpenChange={setEditContactOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('editContactBtn')}</DialogTitle>
          <DialogDescription>{t('contactDetailsDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">{t('firstName')}</Label>
              <Input
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                className="bg-muted border-border text-foreground h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">{t('lastName')}</Label>
              <Input
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                className="bg-muted border-border text-foreground h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">{t('nickname')}</Label>
              <Input
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                className="bg-muted border-border text-foreground h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">
                {t('phone')} <span className="text-red-400">*</span>
              </Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="bg-muted border-border text-foreground h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">{t('landlinePhone')}</Label>
              <Input
                value={editLandlinePhone}
                onChange={(e) => setEditLandlinePhone(e.target.value)}
                className="bg-muted border-border text-foreground h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">{t('email')}</Label>
              <Input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="bg-muted border-border text-foreground h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">{t('address')}</Label>
              <Input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="bg-muted border-border text-foreground h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">{t('leadSource')}</Label>
              <select
                value={editLeadSource}
                onChange={(e) => setEditLeadSource(e.target.value)}
                className="h-8 w-full rounded-md border border-border bg-muted px-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">{t('selectLeadSource')}</option>
                <option value="google">{t('leadSources.google')}</option>
                <option value="social_media">{t('leadSources.socialMedia')}</option>
                <option value="referral">{t('leadSources.referral')}</option>
                <option value="whatsapp">{t('leadSources.whatsapp')}</option>
                <option value="website">{t('leadSources.website')}</option>
                <option value="advertising">{t('leadSources.advertising')}</option>
                <option value="other">{t('leadSources.other')}</option>
              </select>
            </div>
          </div>
          <Button
            onClick={saveDetails}
            disabled={savingDetails}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
            size="sm"
          >
            {savingDetails ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {t('saveChangesBtn')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <TemplatePicker
      open={templatePickerOpen}
      onOpenChange={setTemplatePickerOpen}
      onSelect={handleSendTemplate}
    />
    </>
  );
}
