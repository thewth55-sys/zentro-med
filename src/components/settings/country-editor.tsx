'use client';

// ============================================================
// CountryEditor — dropdown editor for accounts.country, same
// PATCH /api/account pattern as SpecialtyEditor (see
// src/lib/country.ts for the fixed value list this must match).
// ============================================================

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { ACCOUNT_COUNTRIES, COUNTRY_LABELS, type AccountCountry } from '@/lib/country';

interface CountryEditorProps {
  value: AccountCountry;
  editable: boolean;
  onSaved: (value: AccountCountry) => void;
}

export function CountryEditor({ value, editable, onSaved }: CountryEditorProps) {
  const [saving, setSaving] = useState(false);

  async function handleChange(next: AccountCountry) {
    if (next === value) return;
    setSaving(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'failed');
      onSaved(data.account.country as AccountCountry);
      toast.success('País actualizado');
    } catch (err) {
      console.error('Update country error:', err);
      toast.error('No se pudo actualizar el país');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={!editable || saving}
        onChange={(e) => handleChange(e.target.value as AccountCountry)}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm disabled:opacity-60"
      >
        {ACCOUNT_COUNTRIES.map((c) => (
          <option key={c} value={c}>
            {COUNTRY_LABELS[c]}
          </option>
        ))}
      </select>
      {saving && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
    </div>
  );
}
