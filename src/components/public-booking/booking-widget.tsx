"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PublicBookingConfig } from "@/lib/scheduling/public-booking";

interface Slot {
  start_at: string;
  end_at: string;
}

const timeFormatter = new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit" });
const dateFormatter = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });

/** Today, formatted as YYYY-MM-DD for the date input's min/default. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BookingWidget({
  slug,
  config,
}: {
  slug: string;
  config: PublicBookingConfig;
}) {
  const [serviceTypeId, setServiceTypeId] = useState(config.serviceTypes[0]?.id ?? "");
  const [doctorId, setDoctorId] = useState(config.doctors[0]?.id ?? "");
  // Ubicación (consultorio) — solo cuando la cuenta tiene horarios por
  // consultorio (premium). Con una sola ubicación se elige sola; con varias
  // se muestra un selector.
  const showRooms = config.clinicHoursEnabled && config.rooms.length > 0;
  const [roomId, setRoomId] = useState(showRooms ? config.rooms[0].id : "");
  const [date, setDate] = useState(todayIso());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Slot | null>(null);
  const [showTerms, setShowTerms] = useState(false);

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

  const canSubmit = useMemo(
    () => !!selectedSlot && name.trim().length > 1 && phone.trim().length >= 8,
    [selectedSlot, name, phone],
  );

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
      setConfirmed(selectedSlot);
    } catch {
      setError("No se pudo agendar la cita. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center">
        <CalendarCheck className="mx-auto size-10 text-primary" />
        <h2 className="mt-4 text-xl font-semibold text-foreground">Cita agendada</h2>
        <p className="mt-2 text-muted-foreground">
          {dateFormatter.format(new Date(confirmed.start_at))} a las{" "}
          {timeFormatter.format(new Date(confirmed.start_at))}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Te contactaremos para confirmar los detalles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
      {config.serviceTypes.length === 0 || config.doctors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este consultorio aún no tiene horarios disponibles para agendar en línea.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Servicio</Label>
              <Select value={serviceTypeId} onValueChange={(v) => setServiceTypeId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elige un servicio">
                    {(value: string) => {
                      const s = config.serviceTypes.find((s) => s.id === value);
                      return s ? `${s.name} (${s.duration_minutes} min)` : "Elige un servicio";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {config.serviceTypes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.duration_minutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select value={doctorId} onValueChange={(v) => setDoctorId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elige un doctor">
                    {(value: string) => {
                      const d = config.doctors.find((d) => d.id === value);
                      return d ? `${d.name}${d.specialty ? ` — ${d.specialty}` : ""}` : "Elige un doctor";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {config.doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                      {d.specialty ? ` — ${d.specialty}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {showRooms && config.rooms.length > 1 && (
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Select value={roomId} onValueChange={(v) => setRoomId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elige una ubicación">
                    {(value: string) => config.rooms.find((r) => r.id === value)?.name ?? "Elige una ubicación"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {config.rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="booking-date">Fecha</Label>
            <Input
              id="booking-date"
              type="date"
              min={todayIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-fit"
            />
          </div>

          <div className="space-y-2">
            <Label>Horarios disponibles</Label>
            {slotsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Buscando horarios…
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay horarios disponibles ese día. Prueba otra fecha.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.start_at}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      selectedSlot?.start_at === slot.start_at
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    {timeFormatter.format(new Date(slot.start_at))}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedSlot && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="booking-name">Nombre completo</Label>
                  <Input id="booking-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking-phone">Teléfono (WhatsApp)</Label>
                  <Input id="booking-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-email">Correo (opcional)</Label>
                <Input
                  id="booking-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {deposit?.enabled && (
                <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                  <p className="flex items-start gap-2 text-foreground">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                    Para reservar deberás realizar un pago de {depositAmountLabel} como anticipo de tu
                    consulta. Al hacer clic en &quot;Confirmar cita&quot; serás dirigido a completar el pago.
                  </p>
                  {deposit.bookingTerms && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowTerms((v) => !v)}
                        className="text-sm font-medium text-primary underline underline-offset-2"
                      >
                        {showTerms ? "Ocultar términos y condiciones" : "Ver términos y condiciones"}
                      </button>
                      {showTerms && (
                        <p className="whitespace-pre-wrap rounded-md bg-background/60 p-3 text-xs text-muted-foreground">
                          {deposit.bookingTerms}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full sm:w-auto">
                {submitting ? "Agendando…" : "Confirmar cita"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
