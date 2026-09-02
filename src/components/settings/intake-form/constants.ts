import type { IntakeFieldType } from "@/lib/intake-forms/types";

export const FIELD_TYPE_LABEL: Record<IntakeFieldType, string> = {
  short_text: "Texto corto",
  long_text: "Texto largo",
  date: "Fecha",
  number: "Número",
  phone: "Teléfono",
  email: "Correo",
  single_choice: "Opción única",
};

export const FIELD_TYPES = Object.keys(FIELD_TYPE_LABEL) as IntakeFieldType[];
