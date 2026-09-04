// Iniciales + color determinístico por nombre, para que la misma
// persona conserve siempre el mismo color de avatar (patrón ya usado
// en today-appointments.tsx, extraído aquí para reutilizarlo también
// en el listado de pacientes sin duplicar la lógica).
const AVATAR_TINTS = [
  'bg-teal-500/15 text-teal-600 dark:text-teal-300',
  'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',
  'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  'bg-primary/12 text-primary',
];

export function patientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  // Primeras dos palabras, no primera+última — con nombres compuestos
  // hispanos (nombre + segundo nombre + 2 apellidos) eso da iniciales más
  // reconocibles ("Kenia Renata Tello Mejía" → KR, no KM) y es lo que
  // muestra el mockup.
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function patientAvatarTint(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}
