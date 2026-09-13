"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Doctor, PatientProfile } from "@/types";

interface MedicalTabProps {
  contactId: string;
  /** Called right after a new patient_profiles row is created — lets
   *  the parent (contact-detail-view.tsx) re-run its own "is this
   *  contact a converted patient" check, so the summary banner and the
   *  Odontograma tab pick it up without a full page reload. */
  onProfileCreated?: () => void;
}

/**
 * Médico tab — patient medical/administrative profile (editable).
 * Clinical notes (SOAP) moved to their own "Notas de evolución" tab
 * (soap-notes-tab.tsx) — this tab keeps only the demographic/clinical
 * background fields (document, allergies, insurance, etc.), never the
 * note-taking timeline that used to live here.
 */
export function MedicalTab({ contactId, onProfileCreated }: MedicalTabProps) {
  const t = useTranslations("Contacts.detailView.medicalTab");
  const supabase = createClient();
  const { accountId, account } = useAuth();
  const isMexico = account?.country !== "co";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Profile form state
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [chronicConditions, setChronicConditions] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [assignedDoctorId, setAssignedDoctorId] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthCountry, setBirthCountry] = useState("");
  const [hcNumber, setHcNumber] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [patientGroup, setPatientGroup] = useState("");
  const [occupation, setOccupation] = useState("");
  const [sex, setSex] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [profileRes, doctorsRes] = await Promise.all([
        supabase.from("patient_profiles").select("*").eq("contact_id", contactId).maybeSingle(),
        supabase.from("doctors").select("*").eq("is_active", true).order("name"),
      ]);
      if (cancelled) return;
      const p = (profileRes.data ?? null) as PatientProfile | null;
      setProfile(p);
      setDoctors((doctorsRes.data ?? []) as Doctor[]);
      if (p) {
        setBloodType(p.blood_type ?? "");
        setAllergies(p.allergies ?? "");
        setChronicConditions(p.chronic_conditions ?? "");
        setCurrentMedications(p.current_medications ?? "");
        setEmergencyContactName(p.emergency_contact_name ?? "");
        setEmergencyContactPhone(p.emergency_contact_phone ?? "");
        setAssignedDoctorId(p.assigned_doctor_id ?? "");
        setGeneralNotes(p.notes ?? "");
        setDocumentType(p.document_type ?? "");
        setDocumentNumber(p.document_number ?? "");
        setBirthDate(p.birth_date ?? "");
        setBirthCountry(p.birth_country ?? "");
        setHcNumber(p.hc_number ?? "");
        setInsuranceProvider(p.insurance_provider ?? "");
        setPatientGroup(p.patient_group ?? "");
        setOccupation(p.occupation ?? "");
        setSex(p.sex ?? "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  async function createProfile() {
    if (!accountId) return;
    setCreatingProfile(true);
    try {
      const { data, error } = await supabase
        .from("patient_profiles")
        .insert({ account_id: accountId, contact_id: contactId })
        .select("*")
        .single();
      if (error) throw error;
      setProfile(data as PatientProfile);
      toast.success(t("profileCreated"));
      onProfileCreated?.();
    } catch (err) {
      // Migration 064: converting a contact into a patient is what the
      // plan's patient-limit trigger now checks (moved off `contacts`
      // inserts, which should never be capped — see the migration's
      // doc comment) — surface an upgrade prompt instead of the raw
      // Postgres exception text.
      if (err instanceof Error && err.message.includes("ZENTRO_PATIENT_LIMIT")) {
        toast.error(t("profileLimitReached"));
        return;
      }
      console.error("Create patient profile error:", err);
      toast.error(t("profileCreateFailed"));
    } finally {
      setCreatingProfile(false);
    }
  }

  async function saveProfile() {
    if (!profile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("patient_profiles")
        .update({
          blood_type: bloodType.trim() || null,
          allergies: allergies.trim() || null,
          chronic_conditions: chronicConditions.trim() || null,
          current_medications: currentMedications.trim() || null,
          emergency_contact_name: emergencyContactName.trim() || null,
          emergency_contact_phone: emergencyContactPhone.trim() || null,
          assigned_doctor_id: assignedDoctorId || null,
          notes: generalNotes.trim() || null,
          document_type: documentType || null,
          document_number: documentNumber.trim() || null,
          birth_date: birthDate || null,
          birth_country: birthCountry.trim() || null,
          hc_number: hcNumber.trim() || null,
          insurance_provider: insuranceProvider.trim() || null,
          patient_group: patientGroup.trim() || null,
          occupation: occupation.trim() || null,
          sex: sex || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
      toast.success(t("profileSaved"));
    } catch (err) {
      console.error("Save patient profile error:", err);
      toast.error(t("profileSaveFailed"));
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">{t("noProfile")}</p>
        <Button onClick={createProfile} disabled={creatingProfile} className="bg-primary text-primary-foreground hover:bg-primary/90" size="sm">
          {creatingProfile ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          {t("createProfile")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Medical profile */}
      <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("profileTitle")}</p>

        {/* Document + demographics */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("documentType")}</Label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">{t("selectDocumentType")}</option>
              {isMexico ? (
                <>
                  <option value="curp">{t("documentTypes.curp")}</option>
                  <option value="rfc">{t("documentTypes.rfc")}</option>
                  <option value="ine">{t("documentTypes.ine")}</option>
                  <option value="nss">{t("documentTypes.nss")}</option>
                  <option value="pasaporte">{t("documentTypes.pasaporte")}</option>
                  <option value="cedula_ciudadania">{t("documentTypes.cedulaCiudadania")}</option>
                  <option value="cedula_extranjeria">{t("documentTypes.cedulaExtranjeria")}</option>
                  <option value="tarjeta_identidad">{t("documentTypes.tarjetaIdentidad")}</option>
                  <option value="nit">{t("documentTypes.nit")}</option>
                </>
              ) : (
                <>
                  <option value="cedula_ciudadania">{t("documentTypes.cedulaCiudadania")}</option>
                  <option value="cedula_extranjeria">{t("documentTypes.cedulaExtranjeria")}</option>
                  <option value="tarjeta_identidad">{t("documentTypes.tarjetaIdentidad")}</option>
                  <option value="nit">{t("documentTypes.nit")}</option>
                  <option value="pasaporte">{t("documentTypes.pasaporte")}</option>
                  <option value="curp">{t("documentTypes.curp")}</option>
                  <option value="rfc">{t("documentTypes.rfc")}</option>
                  <option value="ine">{t("documentTypes.ine")}</option>
                  <option value="nss">{t("documentTypes.nss")}</option>
                </>
              )}
              <option value="otro">{t("documentTypes.otro")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("documentNumber")}</Label>
            <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} className="h-8 bg-card text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("birthDate")}</Label>
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="h-8 bg-card text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("birthCountry")}</Label>
            <Input value={birthCountry} onChange={(e) => setBirthCountry(e.target.value)} className="h-8 bg-card text-sm" />
          </div>
        </div>

        {/* Clinic admin fields */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("hcNumber")}</Label>
            <Input value={hcNumber} onChange={(e) => setHcNumber(e.target.value)} className="h-8 bg-card text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("sex")}</Label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">{t("selectSex")}</option>
              <option value="male">{t("sexOptions.male")}</option>
              <option value="female">{t("sexOptions.female")}</option>
              <option value="other">{t("sexOptions.other")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("insuranceProvider")}</Label>
            <Input value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} className="h-8 bg-card text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("occupation")}</Label>
            <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} className="h-8 bg-card text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("patientGroup")}</Label>
          <Input value={patientGroup} onChange={(e) => setPatientGroup(e.target.value)} className="h-8 bg-card text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("bloodType")}</Label>
            <Input value={bloodType} onChange={(e) => setBloodType(e.target.value)} className="h-8 bg-card text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("assignedDoctor")}</Label>
            <select
              value={assignedDoctorId}
              onChange={(e) => setAssignedDoctorId(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">{t("selectDoctor")}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldAlert className="size-3.5 text-amber-400" />
            {t("allergies")}
          </Label>
          <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder={t("allergiesPlaceholder")} className="h-8 bg-card text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("chronicConditions")}</Label>
          <Input value={chronicConditions} onChange={(e) => setChronicConditions(e.target.value)} className="h-8 bg-card text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("currentMedications")}</Label>
          <Input value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} className="h-8 bg-card text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("emergencyContactName")}</Label>
            <Input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} className="h-8 bg-card text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("emergencyContactPhone")}</Label>
            <Input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} className="h-8 bg-card text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("generalNotes")}</Label>
          <Textarea value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} className="min-h-[50px] bg-card text-sm" />
        </div>
        <Button onClick={saveProfile} disabled={savingProfile} size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          {savingProfile ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {t("saveProfile")}
        </Button>
      </div>
    </div>
  );
}
