"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { trackConversion } from "@/lib/conversions/track-client";
import { formatCurrency } from "@/lib/currency";
import type { Appointment, Contact, Deal, ContactNote, Tag } from "@/types";
import {
  Phone,
  Mail,
  Copy,
  Check,
  User,
  Tag as TagIcon,
  DollarSign,
  StickyNote,
  Plus,
  CalendarClock,
  AlertTriangle,
  UserPlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface ContactSidebarProps {
  contact: Contact | null;
}

export function ContactSidebar({ contact }: ContactSidebarProps) {
  const tSidebar = useTranslations("Inbox.sidebar");
  const tThread = useTranslations("Inbox.messageThread");

  const { accountId, defaultCurrency } = useAuth();
  const [copied, setCopied] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [tags, setTags] = useState<(Tag & { contact_tag_id: string })[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // `undefined` = still loading (don't flash the "convertir" button
  // before we actually know); `null` = confirmed not a patient yet.
  const [patientProfile, setPatientProfile] = useState<
    { id: string; allergies: string | null } | null | undefined
  >(undefined);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [balanceOwed, setBalanceOwed] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);

  const fetchContactData = useCallback(async () => {
    if (!contact) return;

    const supabase = createClient();

    // Fetch deals, notes, tags, patient-profile/allergies, next
    // appointment and billing balance in parallel — the last three
    // reuse the exact same routes/filters as the contact detail
    // page's own header chips (contact-detail-view.tsx), just scoped
    // to whichever contact is active in this conversation.
    const [dealsRes, notesRes, tagsRes, profileRes, apptRes, invRes] = await Promise.all([
      supabase
        .from("deals")
        .select("*, stage:pipeline_stages(*)")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_notes")
        .select("*")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_tags")
        .select("id, tag_id, tags(*)")
        .eq("contact_id", contact.id),
      supabase
        .from("patient_profiles")
        .select("id, allergies")
        .eq("contact_id", contact.id)
        .maybeSingle(),
      fetch(`/api/appointments?contact_id=${contact.id}`)
        .then((r) => r.json())
        .catch(() => ({})),
      fetch(`/api/billing/invoices?contact_id=${contact.id}`)
        .then((r) => r.json())
        .catch(() => ({})),
    ]);

    if (dealsRes.data) setDeals(dealsRes.data);
    if (notesRes.data) setNotes(notesRes.data);
    if (tagsRes.data) {
      const mapped = tagsRes.data
        .filter((ct: Record<string, unknown>) => ct.tags)
        .map((ct: Record<string, unknown>) => ({
          ...(ct.tags as Tag),
          contact_tag_id: ct.id as string,
        }));
      setTags(mapped);
    }
    setPatientProfile(profileRes.data ?? null);

    const now = Date.now();
    const appointments = (apptRes.appointments ?? []) as Appointment[];
    setNextAppointment(
      appointments.find((a) => a.status !== "cancelled" && new Date(a.start_at).getTime() >= now) ?? null,
    );

    const invoices = (invRes.invoices ?? []) as Array<{ status: string; total: number; amount_paid: number }>;
    setBalanceOwed(
      invoices
        .filter((i) => i.status !== "draft" && i.status !== "void")
        .reduce((sum, i) => sum + (Number(i.total) - Number(i.amount_paid)), 0),
    );
  }, [contact]);

  // Load on contact change. setContactData/setTags run inside async
  // Supabase callbacks, not synchronously in the effect body.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContactData();
  }, [fetchContactData]);

  // "Convertir en paciente" — same insert medical-tab.tsx's own
  // createProfile() does (same ZENTRO_PATIENT_LIMIT plan-limit error
  // to handle, migration 064). On top of that, this also advances the
  // *pipeline*, since a WhatsApp lead converting is exactly the "won"
  // moment for whatever deal brought them in.
  //
  // "Advance to Ganado" is deliberately `deals.status = 'won'` — the
  // same column the pipeline's own Won/Lost buttons write
  // (deal-form.tsx) — not a move to some stage literally named
  // "Ganado". Stages are just a renameable label+position
  // (pipeline_stages has no "is won" flag), so a stage-based rule
  // would silently stop working the moment someone renames or
  // reorders their pipeline; `status` is the actual structural
  // signal the rest of the app already treats as authoritative.
  //
  // A contact can have zero or several deals with no existing "the
  // deal for this contact" convention anywhere else in the app — this
  // picks the most recently created *open* one. No open deal just
  // means there's nothing to advance; it never fabricates one.
  const handleConvertToPatient = useCallback(async () => {
    if (!contact || !accountId) return;
    setConverting(true);
    const supabase = createClient();
    try {
      const { data: profile, error } = await supabase
        .from("patient_profiles")
        .insert({ account_id: accountId, contact_id: contact.id })
        .select("id, allergies")
        .single();
      if (error) throw error;
      setPatientProfile(profile);

      const { data: openDeal } = await supabase
        .from("deals")
        .select("id, value, currency")
        .eq("contact_id", contact.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openDeal) {
        await supabase.from("deals").update({ status: "won" }).eq("id", openDeal.id);
        trackConversion("deal_won", {
          phone: contact.phone,
          email: contact.email ?? undefined,
          dealValue: openDeal.value,
          dealCurrency: openDeal.currency,
        });
        toast.success(tSidebar("patientCreatedWithDeal"));
        await fetchContactData();
      } else {
        toast.success(tSidebar("patientCreated"));
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("ZENTRO_PATIENT_LIMIT")) {
        toast.error(tSidebar("patientLimitReached"));
      } else {
        console.error("Convert to patient error:", err);
        toast.error(tSidebar("patientCreateFailed"));
      }
    } finally {
      setConverting(false);
    }
  }, [contact, accountId, tSidebar, fetchContactData]);

  const handleCopyPhone = useCallback(async () => {
    if (!contact?.phone) return;
    await navigator.clipboard.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Dep is the whole `contact` object (not `contact?.phone`) so the
    // React Compiler's inference agrees with the manual dep list —
    // fixes the `preserve-manual-memoization` lint error.
  }, [contact]);

  const handleAddNote = useCallback(async () => {
    if (!contact || !newNote.trim()) return;
    if (!accountId) return;
    setAddingNote(true);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    const { data, error } = await supabase
      .from("contact_notes")
      .insert({
        contact_id: contact.id,
        account_id: accountId,
        user_id: user?.id,
        note_text: newNote.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setNotes((prev) => [data, ...prev]);
      setNewNote("");
    }
    setAddingNote(false);
  }, [contact, newNote, accountId]);

  if (!contact) {
    return (
      <div className="flex h-full w-70 items-center justify-center border-l border-border bg-card">
        <p className="text-sm text-muted-foreground">{tThread("selectConversation")}</p>
      </div>
    );
  }

  const displayName = contact.name || contact.phone;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-full w-70 flex-col border-l border-border bg-card">
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Contact Info */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-semibold text-foreground">
              {contact.avatar_url ? (
                <img
                  src={contact.avatar_url}
                  alt={displayName}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              {displayName}
            </h3>
            {contact.company && (
              <p className="text-xs text-muted-foreground">{contact.company}</p>
            )}
          </div>

          {/* Phone */}
          <div className="mt-4 space-y-2">
            <button
              onClick={handleCopyPhone}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">{contact.phone}</span>
              {copied ? (
                <Check className="h-3 w-3 text-primary" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>

            {contact.email && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* Contexto del paciente — solo se muestra lo que hay dato
              real: próxima cita y saldo aplican a cualquier contacto
              (mismos endpoints que ya usa el encabezado de la ficha),
              la alerta de alergia solo si ya existe un perfil médico
              con algo escrito ahí. */}
          {(nextAppointment || (balanceOwed ?? 0) > 0 || patientProfile?.allergies) && (
            <>
              <div className="space-y-2">
                {nextAppointment && (
                  <div className="rounded-lg border border-border px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <CalendarClock className="h-3 w-3" />
                      {tSidebar("nextAppointment")}
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {format(new Date(nextAppointment.start_at), "EEE d MMM · HH:mm")}
                    </p>
                  </div>
                )}
                {(balanceOwed ?? 0) > 0 && (
                  <div className="rounded-lg border border-border px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {tSidebar("balancePending")}
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-red-500">
                      {formatCurrency(balanceOwed ?? 0, defaultCurrency)}
                    </p>
                  </div>
                )}
                {patientProfile?.allergies && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-500">
                      <AlertTriangle className="h-3 w-3" />
                      {tSidebar("allergyAlert")}
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-red-500">{patientProfile.allergies}</p>
                  </div>
                )}
              </div>
              <div className="my-4 border-t border-border" />
            </>
          )}

          {/* Convertir en paciente — solo visible antes de la
              conversión (patientProfile confirmado null, no mientras
              carga). Ver el comentario junto a handleConvertToPatient
              para las reglas de qué avanza en el pipeline. */}
          {patientProfile === null && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleConvertToPatient}
                disabled={converting}
              >
                {converting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                {tSidebar("convertToPatient")}
              </Button>
              <div className="my-4 border-t border-border" />
            </>
          )}

          {/* Tags */}
          <div>
            <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <TagIcon className="h-3 w-3" />
              {tSidebar("tags")}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">{tSidebar("noTags")}</p>
              ) : (
                tags.map((tag) => (
                  <span
                    key={tag.contact_tag_id}
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* Active Deals */}
          <div>
            <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              {tSidebar("deals")}
            </div>
            <div className="mt-2 space-y-2">
              {deals.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">{tSidebar("noDeals")}</p>
              ) : (
                deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-lg bg-muted px-3 py-2"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {deal.title}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {deal.currency ?? "$"}
                        {deal.value.toLocaleString()}
                      </span>
                      {deal.stage && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px]"
                          style={{
                            backgroundColor: `${deal.stage.color}20`,
                            color: deal.stage.color,
                          }}
                        >
                          {deal.stage.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <StickyNote className="h-3 w-3" />
              {tSidebar("notes")}
            </div>
            <div className="mt-2">
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder={tSidebar("addNotePlaceholder")}
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-primary/50"
                />
                <Button
                  size="sm"
                  className="h-auto bg-primary px-2 hover:bg-primary/90"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addingNote}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="mt-2 space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg bg-muted px-3 py-2"
                  >
                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                      {note.note_text}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {format(new Date(note.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
