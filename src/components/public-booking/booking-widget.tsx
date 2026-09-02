"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck } from "lucide-react";

import type { PublicBookingConfig } from "@/lib/scheduling/public-booking";
import type { IntakeFormConfig } from "@/lib/intake-forms/types";
import { SlotStep, type Slot } from "./steps/slot-step";
import { IdentifyStep, type IdentifyResult } from "./steps/identify-step";
import { ConfirmStep } from "./steps/confirm-step";
import { IntakeFormRenderer } from "./intake-form-renderer";
import { StepIndicator } from "./step-indicator";

type Step = "slot" | "identify" | "intake" | "confirm";

/** Today, formatted as YYYY-MM-DD for the date input's min/default. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Public booking wizard — orchestrates the step machine, owns all
 * accumulated state, and fires the single final POST /book request.
 * Each step is self-contained UI; this component is the only one that
 * knows how they chain together.
 *
 *   slot → identify → [intake, only for a new patient whose doctor
 *   has a configured form] → confirm
 *
 * A doctor with no intake_form_config renders identically to the
 * pre-wizard single-step flow (identify skips straight to confirm) —
 * the new steps degrade to a no-op for every account that hasn't
 * built a form yet.
 */
export function BookingWidget({
  slug,
  config,
}: {
  slug: string;
  config: PublicBookingConfig;
}) {
  const [step, setStep] = useState<Step>("slot");

  // Paso 1 — horario.
  const [serviceTypeId, setServiceTypeId] = useState(config.serviceTypes[0]?.id ?? "");
  const [doctorId, setDoctorId] = useState(config.doctors[0]?.id ?? "");
  const showRooms = config.clinicHoursEnabled && config.rooms.length > 0;
  const [roomId, setRoomId] = useState(showRooms ? config.rooms[0].id : "");
  const [date, setDate] = useState(todayIso());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Paso 2 — identificación.
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [hasName, setHasName] = useState(false);
  const [intakeFormConfig, setIntakeFormConfig] = useState<IntakeFormConfig | null>(null);

  // Paso 3 — formulario de admisión (solo paciente nuevo con formulario configurado).
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string> | null>(null);

  // Paso 4 — confirmar.
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [confirmed, setConfirmed] = useState<Slot | null>(null);
  const [intakeSaveFailed, setIntakeSaveFailed] = useState(false);

  const deposit = config.deposit;
  const depositAmountLabel = useMemo(() => {
    if (!deposit) return "";
    try {
      return new Intl.NumberFormat("es-MX", { style: "currency", currency: deposit.currency }).format(
        deposit.amount,
      );
    } catch {
      return `${deposit.amount} ${deposit.currency}`;
    }
  }, [deposit]);

  useEffect(() => {
    if (!serviceTypeId || !doctorId || !date) return;
    setSelectedSlot(null);
    setSlotsLoading(true);
    const params = new URLSearchParams({ doctor_id: doctorId, service_type_id: serviceTypeId, date });
    if (roomId) params.set("room_id", roomId);
    fetch(`/api/public/booking/${encodeURIComponent(slug)}/slots?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [slug, serviceTypeId, doctorId, roomId, date]);

  function handleIdentifyResolved(result: IdentifyResult) {
    setPhone(result.phone);
    setEmail(result.email);
    setIsNewPatient(!result.found);
    setHasName(result.hasName);
    setIntakeFormConfig(result.intakeFormConfig);
    if (!result.found && result.intakeFormConfig) {
      setStep("intake");
    } else {
      setStep("confirm");
    }
  }

  async function handleSubmit() {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/booking/${encodeURIComponent(slug)}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          service_type_id: serviceTypeId,
          start_at: selectedSlot.start_at,
          name,
          phone,
          email: email || undefined,
          room_id: roomId || undefined,
          intake_answers:
            isNewPatient && intakeAnswers
              ? Object.entries(intakeAnswers).map(([field_id, value]) => ({ field_id, value }))
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo agendar la cita. Intenta de nuevo.");
        return;
      }
      // La cita ya quedó creada en el servidor sin importar lo que
      // pase de aquí en adelante — checkoutUrl solo aparece cuando la
      // cuenta tiene un anticipo activo. Si viene, mandamos al
      // visitante a pagar en vez de mostrar "confirmada" de una vez.
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setIntakeSaveFailed(!!data.intakeSaveFailed);
      setConfirmed(selectedSlot);
    } catch {
      setError("No se pudo agendar la cita. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div className="p-8 text-center">
        <CalendarCheck className="mx-auto size-10 text-primary" />
        <h2 className="mt-4 text-xl font-semibold text-foreground">Cita agendada</h2>
        <p className="mt-2 text-muted-foreground">
          {new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(
            new Date(confirmed.start_at),
          )}{" "}
          a las{" "}
          {new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit" }).format(
            new Date(confirmed.start_at),
          )}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">Te contactaremos para confirmar los detalles.</p>
        {intakeSaveFailed && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            No pudimos guardar tus respuestas del formulario de admisión — nuestro equipo te contactará para
            completarlas.
          </p>
        )}
      </div>
    );
  }

  if (config.serviceTypes.length === 0 || config.doctors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este consultorio aún no tiene horarios disponibles para agendar en línea.
      </p>
    );
  }

  const doctorName = config.doctors.find((d) => d.id === doctorId)?.name ?? "";
  const serviceTypeName = config.serviceTypes.find((s) => s.id === serviceTypeId)?.name ?? "";
  const confirmBackStep: Step = isNewPatient && intakeFormConfig ? "intake" : "identify";

  const stepLabels = ["Horario", "Contacto", ...(isNewPatient && intakeFormConfig ? ["Formulario"] : []), "Confirmar"];
  const stepIndex = { slot: 0, identify: 1, intake: 2, confirm: stepLabels.length - 1 }[step];

  return (
    <div className="space-y-4">
      <StepIndicator steps={stepLabels} currentIndex={stepIndex} />

      {step === "slot" && (
        <SlotStep
          config={config}
          serviceTypeId={serviceTypeId}
          setServiceTypeId={setServiceTypeId}
          doctorId={doctorId}
          setDoctorId={setDoctorId}
          showRooms={showRooms}
          roomId={roomId}
          setRoomId={setRoomId}
          date={date}
          setDate={setDate}
          todayIso={todayIso()}
          slots={slots}
          slotsLoading={slotsLoading}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          onContinue={() => setStep("identify")}
        />
      )}

      {step === "identify" && (
        <IdentifyStep
          slug={slug}
          doctorId={doctorId}
          onResolved={handleIdentifyResolved}
          onBack={() => setStep("slot")}
        />
      )}

      {step === "intake" && intakeFormConfig && (
        <IntakeFormRenderer
          config={intakeFormConfig}
          submitLabel="Continuar"
          onBack={() => setStep("identify")}
          onComplete={(answers) => {
            setIntakeAnswers(answers);
            setStep("confirm");
          }}
        />
      )}

      {step === "confirm" && selectedSlot && (
        <ConfirmStep
          doctorName={doctorName}
          serviceTypeName={serviceTypeName}
          startAt={selectedSlot.start_at}
          showNameField={!hasName}
          name={name}
          setName={setName}
          deposit={deposit}
          depositAmountLabel={depositAmountLabel}
          showTerms={showTerms}
          setShowTerms={setShowTerms}
          error={error}
          submitting={submitting}
          onSubmit={handleSubmit}
          onBack={() => setStep(confirmBackStep)}
        />
      )}
    </div>
  );
}
