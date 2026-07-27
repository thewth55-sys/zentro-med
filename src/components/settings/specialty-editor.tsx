'use client';

// ============================================================
// SpecialtyEditor — dropdown editor for accounts.specialty, same
// PATCH /api/account pattern as InlineFieldEditor but a <select>
// instead of free text (see src/lib/specialties.ts for the fixed
// value list this must match).
// ============================================================

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { ACCOUNT_SPECIALTIES, SPECIALTY_LABELS, type AccountSpecialty } from '@/lib/specialties';

interface SpecialtyEditorProps {
  value: AccountSpecialty;
  editable: boolean;
  onSaved: (value: AccountSpecialty) => void;
}

export function SpecialtyEditor({ value, editable, onSaved }: SpecialtyEditorProps) {
  const [saving, setSaving] = useState(false);

  async function handleChange(next: AccountSpecialty) {
    if (next === value) return;
    setSaving(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialty: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'failed');
      onSaved(data.account.specialty as AccountSpecialty);
      toast.success('Especialidad actualizada');
    } catch (err) {
      console.error('Update specialty error:', err);
      toast.error('No se pudo actualizar la especialidad');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={!editable || saving}
        onChange={(e) => handleChange(e.target.value as AccountSpecialty)}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm disabled:opacity-60"
      >
        {ACCOUNT_SPECIALTIES.map((s) => (
          <option key={s} value={s}>
            {SPECIALTY_LABELS[s]}
          </option>
        ))}
      </select>
      {saving && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
    </div>
  );
}
