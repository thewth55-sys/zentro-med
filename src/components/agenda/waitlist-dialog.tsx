"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplatePicker, type TemplateSendValues } from "@/components/inbox/template-picker";
import type { Contact, Doctor, MessageTemplate, ServiceType, WaitlistEntry } from "@/types";

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctors: Doctor[];
  serviceTypes: ServiceType[];
  /** Pre-fills the add-entry form when opened from a specific detected
   *  free block (see agenda-sidebar.tsx) — still editable, since the
   *  slot's doctor is a sensible default, not a hard requirement. */
  initialDoctorId?: string | null;
  onChanged?: () => void;
}

/**
 * Manage the account's waitlist (migration 108): who's waiting, and
 * for each entry — notify them by WhatsApp template when a slot opens
 * (same template-send path the contact page's "Enviar plantilla"
 * button uses, since a proactive WhatsApp message needs an approved
 * template regardless of where it's triggered from), mark them
 * booked, or remove them.
 */
export function WaitlistDialog({
  open,
  onOpenChange,
  doctors,
  serviceTypes,
  initialDoctorId,
  onChanged,
}: WaitlistDialogProps) {
  const t = useTranslations("Agenda.waitlist");
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [templatePickerFor, setTemplatePickerFor] = useState<WaitlistEntry | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [contactResults, setContactResults] = useState<Contact[]>([]);
  const [searchingContact, setSearchingContact] = useState(false);
  const contactSearchSeq = useRef(0);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [draftDoctorId, setDraftDoctorId] = useState("");
  const [draftServiceTypeId, setDraftServiceTypeId] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist?status=waiting");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setEntries((data.entries ?? []) as WaitlistEntry[]);
    } catch (err) {
      console.error("Load waitlist error:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!open) return;
    void fetchEntries();
    setShowAddForm(false);
    resetDraft();
    setDraftDoctorId(initialDoctorId || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!contactQuery.trim()) {
      setContactResults([]);
      return;
    }
    const seq = ++contactSearchSeq.current;
    const handle = setTimeout(async () => {
      setSearchingContact(true);
      const like = `%${contactQuery.trim()}%`;
      const { data } = await supabase.from("contacts").select("*").or(`name.ilike.${like},phone.ilike.${like}`).limit(8);
      if (seq !== contactSearchSeq.current) return;
      setContactResults((data ?? []) as Contact[]);
      setSearchingContact(false);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactQuery]);

  function resetDraft() {
    setSelectedContact(null);
    setContactQuery("");
    setContactResults([]);
    setDraftServiceTypeId("");
    setDraftNotes("");
  }

  async function handleAdd() {
    if (!selectedContact) {
      toast.error(t("contactRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: selectedContact.id,
          doctor_id: draftDoctorId || null,
          service_type_id: draftServiceTypeId || null,
          notes: draftNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("failed");
      toast.success(t("added"));
      resetDraft();
      setShowAddForm(false);
      await fetchEntries();
      onChanged?.();
    } catch (err) {
      console.error("Add to waitlist error:", err);
      toast.error(t("addFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(entry: WaitlistEntry, status: "notified" | "booked" | "cancelled") {
    setBusyId(entry.id);
    try {
      const res = await fetch(`/api/waitlist/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("failed");
      await fetchEntries();
      onChanged?.();
    } catch (err) {
      console.error("Update waitlist entry error:", err);
      toast.error(t("updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(entry: WaitlistEntry) {
    setBusyId(entry.id);
    try {
      const res = await fetch(`/api/waitlist/${entry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      await fetchEntries();
      onChanged?.();
    } catch (err) {
      console.error("Remove waitlist entry error:", err);
      toast.error(t("updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleTemplateSelected(template: MessageTemplate, values: TemplateSendValues) {
    const entry = templatePickerFor;
    if (!entry?.contact_id) return;
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: entry.contact_id,
          message_type: "template",
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
      if (!res.ok) throw new Error(payload?.error || `HTTP ${res.status}`);
      toast.success(t("notified", { name: entry.contact?.name || entry.contact?.phone || "" }));
      await updateStatus(entry, "notified");
    } catch (err) {
      const reason = err instanceof Error ? err.message : "network error";
      toast.error(t("notifyFailed", { reason }));
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 && !showAddForm ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {entry.contact?.name || entry.contact?.phone}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[entry.doctor?.name, entry.service_type?.name].filter(Boolean).join(" · ") || t("noPreference")}
                        </p>
                        {entry.notes && <p className="mt-0.5 truncate text-xs text-muted-foreground">{entry.notes}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(entry)}
                        disabled={busyId === entry.id}
                        className="shrink-0 text-muted-foreground hover:text-red-500"
                        aria-label={t("remove")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === entry.id}
                        onClick={() => setTemplatePickerFor(entry)}
                      >
                        {t("notify")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === entry.id}
                        onClick={() => updateStatus(entry, "booked")}
                      >
                        {busyId === entry.id ? <Loader2 className="size-3.5 animate-spin" /> : t("markBooked")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAddForm ? (
              <div className="space-y-2.5 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">{t("contact")}</Label>
                  <button type="button" onClick={() => setShowAddForm(false)} className="text-muted-foreground">
                    <X className="size-3.5" />
                  </button>
                </div>
                {selectedContact ? (
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{selectedContact.name || selectedContact.phone}</p>
                      <p className="truncate text-xs text-muted-foreground">{selectedContact.phone}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedContact(null)} className="text-xs text-primary">
                      {t("change")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Input
                      value={contactQuery}
                      onChange={(e) => setContactQuery(e.target.value)}
                      placeholder={t("searchContactPlaceholder")}
                      className="h-8 text-sm"
                    />
                    {searchingContact && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                    {contactResults.length > 0 && (
                      <div className="max-h-32 space-y-1 overflow-y-auto">
                        {contactResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedContact(c);
                              setContactQuery("");
                              setContactResults([]);
                            }}
                            className="flex w-full flex-col rounded-md p-1.5 text-left text-sm hover:bg-muted"
                          >
                            <span className="truncate text-foreground">{c.name || c.phone}</span>
                            <span className="truncate text-xs text-muted-foreground">{c.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t("doctor")}</Label>
                    <Select value={draftDoctorId} onValueChange={(v) => setDraftDoctorId(v ?? "")}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={t("anyDoctor")} />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t("service")}</Label>
                    <Select value={draftServiceTypeId} onValueChange={(v) => setDraftServiceTypeId(v ?? "")}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={t("anyService")} />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  rows={2}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleAdd} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {t("addToWaitlist")}
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)} className="w-full">
                <Plus className="size-3.5" />
                {t("addToWaitlist")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TemplatePicker
        open={!!templatePickerFor}
        onOpenChange={(next) => !next && setTemplatePickerFor(null)}
        onSelect={handleTemplateSelected}
      />
    </>
  );
}
