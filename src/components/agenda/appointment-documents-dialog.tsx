"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link2, Loader2, Unlink } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type {
  Appointment,
  ClinicalNote,
  ConsentDocument,
  Invoice,
  PatientProfile,
  Quote,
  VisitPhoto,
} from "@/types";

interface AppointmentDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
  contactId: string;
}

/** Minimal shape needed for the "already linked" / "link existing" lists. */
interface Linkable {
  id: string;
  label: string;
  sublabel?: string;
}

function toPhotoLinkable(p: VisitPhoto): Linkable {
  return { id: p.id, label: p.file_name || "Archivo sin nombre", sublabel: new Date(p.created_at).toLocaleDateString() };
}
function toConsentLinkable(c: ConsentDocument): Linkable {
  return { id: c.id, label: c.title, sublabel: c.status };
}
function toQuoteLinkable(q: Quote): Linkable {
  return { id: q.id, label: q.quote_number, sublabel: `${q.currency} ${q.total} · ${q.status}` };
}
function toInvoiceLinkable(inv: Invoice): Linkable {
  return { id: inv.id, label: inv.invoice_number, sublabel: `${inv.currency} ${inv.total} · ${inv.status}` };
}

/**
 * Read-only appointment summary + attach existing patient documents
 * to this appointment. Deliberately does NOT let staff edit the
 * appointment itself (date/time/status) — that stays in
 * AppointmentEditorDialog via the Agenda view. clinical_notes has no
 * "link existing" section: its row is immutable once saved (migration
 * 038's block_clinical_notes_mutation trigger), so association only
 * happens at note-creation time (see medical-tab.tsx's note form).
 */
export function AppointmentDocumentsDialog({
  open,
  onOpenChange,
  appointment,
  contactId,
}: AppointmentDocumentsDialogProps) {
  const t = useTranslations("Contacts.detailView.appointmentsTab.documents");
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [patientProfileId, setPatientProfileId] = useState<string | null>(null);

  const [linkedPhotos, setLinkedPhotos] = useState<Linkable[]>([]);
  const [unlinkedPhotos, setUnlinkedPhotos] = useState<Linkable[]>([]);
  const [linkedConsents, setLinkedConsents] = useState<Linkable[]>([]);
  const [unlinkedConsents, setUnlinkedConsents] = useState<Linkable[]>([]);
  const [linkedQuotes, setLinkedQuotes] = useState<Linkable[]>([]);
  const [unlinkedQuotes, setUnlinkedQuotes] = useState<Linkable[]>([]);
  const [linkedInvoices, setLinkedInvoices] = useState<Linkable[]>([]);
  const [unlinkedInvoices, setUnlinkedInvoices] = useState<Linkable[]>([]);
  const [linkedNotes, setLinkedNotes] = useState<Linkable[]>([]);

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("patient_profiles")
        .select("id")
        .eq("contact_id", contactId)
        .maybeSingle();
      const profileId = (profile as Pick<PatientProfile, "id"> | null)?.id ?? null;
      setPatientProfileId(profileId);

      const [quotesRes, invoicesRes] = await Promise.all([
        supabase.from("quotes").select("id, quote_number, total, currency, status, appointment_id").eq("contact_id", contactId),
        supabase.from("invoices").select("id, invoice_number, total, currency, status, appointment_id").eq("contact_id", contactId),
      ]);
      const quotes = (quotesRes.data ?? []) as Quote[];
      const invoices = (invoicesRes.data ?? []) as Invoice[];
      setLinkedQuotes(quotes.filter((q) => q.appointment_id === appointment.id).map(toQuoteLinkable));
      setUnlinkedQuotes(quotes.filter((q) => !q.appointment_id).map(toQuoteLinkable));
      setLinkedInvoices(invoices.filter((i) => i.appointment_id === appointment.id).map(toInvoiceLinkable));
      setUnlinkedInvoices(invoices.filter((i) => !i.appointment_id).map(toInvoiceLinkable));

      if (profileId) {
        const [photosRes, consentsRes, notesRes] = await Promise.all([
          supabase
            .from("visit_photos")
            .select("id, file_name, created_at, appointment_id")
            .eq("patient_profile_id", profileId),
          supabase
            .from("consent_documents")
            .select("id, title, status, appointment_id")
            .eq("patient_profile_id", profileId),
          supabase
            .from("clinical_notes")
            .select("id, chief_complaint, signed_at, appointment_id")
            .eq("patient_profile_id", profileId)
            .eq("appointment_id", appointment.id),
        ]);
        const photos = (photosRes.data ?? []) as VisitPhoto[];
        const consents = (consentsRes.data ?? []) as ConsentDocument[];
        const notes = (notesRes.data ?? []) as ClinicalNote[];
        setLinkedPhotos(photos.filter((p) => p.appointment_id === appointment.id).map(toPhotoLinkable));
        setUnlinkedPhotos(photos.filter((p) => !p.appointment_id).map(toPhotoLinkable));
        setLinkedConsents(consents.filter((c) => c.appointment_id === appointment.id).map(toConsentLinkable));
        setUnlinkedConsents(consents.filter((c) => !c.appointment_id).map(toConsentLinkable));
        setLinkedNotes(
          notes.map((n) => ({ id: n.id, label: n.chief_complaint, sublabel: new Date(n.signed_at).toLocaleDateString() })),
        );
      } else {
        setLinkedPhotos([]);
        setUnlinkedPhotos([]);
        setLinkedConsents([]);
        setUnlinkedConsents([]);
        setLinkedNotes([]);
      }
    } catch (err) {
      console.error("Load appointment documents error:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [supabase, contactId, appointment.id, t]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function link(table: "visit_photos" | "consent_documents" | "quotes" | "invoices", key: string) {
    const id = selected[key];
    if (!id) return;
    setPendingId(id);
    try {
      const { error } = await supabase.from(table).update({ appointment_id: appointment.id }).eq("id", id);
      if (error) throw error;
      setSelected((prev) => ({ ...prev, [key]: "" }));
      await load();
    } catch (err) {
      console.error("Link document error:", err);
      toast.error(t("linkFailed"));
    } finally {
      setPendingId(null);
    }
  }

  async function unlink(table: "visit_photos" | "consent_documents" | "quotes" | "invoices", id: string) {
    setPendingId(id);
    try {
      const { error } = await supabase.from(table).update({ appointment_id: null }).eq("id", id);
      if (error) throw error;
      await load();
    } catch (err) {
      console.error("Unlink document error:", err);
      toast.error(t("unlinkFailed"));
    } finally {
      setPendingId(null);
    }
  }

  function Section({
    title,
    linked,
    unlinked,
    selectKey,
    table,
    readOnly,
  }: {
    title: string;
    linked: Linkable[];
    unlinked: Linkable[];
    selectKey: string;
    table?: "visit_photos" | "consent_documents" | "quotes" | "invoices";
    readOnly?: boolean;
  }) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        {linked.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("noneLinked")}</p>
        ) : (
          <div className="space-y-1">
            {linked.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate text-foreground">{item.label}</p>
                  {item.sublabel && <p className="truncate text-muted-foreground">{item.sublabel}</p>}
                </div>
                {!readOnly && table && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 shrink-0 px-1.5 text-[11px]"
                    disabled={pendingId === item.id}
                    onClick={() => unlink(table, item.id)}
                  >
                    {pendingId === item.id ? <Loader2 className="size-3 animate-spin" /> : <Unlink className="size-3" />}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        {!readOnly && table && unlinked.length > 0 && (
          <div className="flex items-center gap-1.5">
            <select
              value={selected[selectKey] ?? ""}
              onChange={(e) => setSelected((prev) => ({ ...prev, [selectKey]: e.target.value }))}
              className="h-7 flex-1 rounded-md border border-input bg-transparent px-1.5 text-xs"
            >
              <option value="">{t("selectExisting")}</option>
              {unlinked.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              className="h-7 px-2 text-[11px]"
              disabled={!selected[selectKey] || pendingId !== null}
              onClick={() => link(table, selectKey)}
            >
              <Link2 className="size-3" />
              {t("link")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dateFormatter.format(new Date(appointment.start_at))}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <Section
              title={t("photosAndFiles")}
              linked={linkedPhotos}
              unlinked={unlinkedPhotos}
              selectKey="photos"
              table="visit_photos"
            />
            <Section
              title={t("quotes")}
              linked={linkedQuotes}
              unlinked={unlinkedQuotes}
              selectKey="quotes"
              table="quotes"
            />
            <Section
              title={t("invoices")}
              linked={linkedInvoices}
              unlinked={unlinkedInvoices}
              selectKey="invoices"
              table="invoices"
            />
            <Section
              title={t("consents")}
              linked={linkedConsents}
              unlinked={unlinkedConsents}
              selectKey="consents"
              table="consent_documents"
            />
            <Section
              title={t("clinicalNotes")}
              linked={linkedNotes}
              unlinked={[]}
              selectKey="notes"
              readOnly
            />
            {linkedNotes.length === 0 && <p className="text-[11px] text-muted-foreground">{t("clinicalNotesHint")}</p>}
            {!patientProfileId && (
              <p className="text-[11px] text-muted-foreground">{t("noProfileHint")}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
