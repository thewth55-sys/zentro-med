"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PublicBookingConfig } from "@/lib/scheduling/public-booking";

export interface Slot {
  start_at: string;
  end_at: string;
}

const timeFormatter = new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit" });

/** Servicio → doctor → [consultorio] → fecha → horario — sin cambios
 *  de lógica respecto al widget de un solo paso original, solo
 *  extraído a su propio paso. */
export function SlotStep({
  config,
  serviceTypeId,
  setServiceTypeId,
  doctorId,
  setDoctorId,
  showRooms,
  roomId,
  setRoomId,
  date,
  setDate,
  todayIso,
  slots,
  slotsLoading,
  selectedSlot,
  onSelectSlot,
  onContinue,
}: {
  config: PublicBookingConfig;
  serviceTypeId: string;
  setServiceTypeId: (v: string) => void;
  doctorId: string;
  setDoctorId: (v: string) => void;
  showRooms: boolean;
  roomId: string;
  setRoomId: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  todayIso: string;
  slots: Slot[];
  slotsLoading: boolean;
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-6">
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
          min={todayIso}
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
          <p className="text-sm text-muted-foreground">No hay horarios disponibles ese día. Prueba otra fecha.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot.start_at}
                type="button"
                onClick={() => onSelectSlot(slot)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
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
        <Button onClick={onContinue} className="w-full rounded-full sm:w-auto">
          Continuar
        </Button>
      )}
    </div>
  );
}
