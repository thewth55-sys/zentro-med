import type { SupabaseClient } from '@supabase/supabase-js';

export interface RawPhase {
  /** Present when editing an existing phase; absent for a new one typed inline in the form. */
  id?: string;
  name: string;
  position?: number;
}

/**
 * Upserts a quote's "fases del plan de tratamiento" (create the ones
 * without an id, rename/reorder the ones that have one) and returns
 * the resulting phase id at each array position — so a caller can map
 * `items[i].phase_index` (an index into the SUBMITTED phases array,
 * the only thing the client can reference for a brand-new phase that
 * has no id yet) to a real `phase_id` before inserting the items.
 *
 * Sequential, not Promise.all — this only runs when a human edits a
 * quote's plan (a handful of phases at most), and phases don't have a
 * uniqueness constraint on `position` that parallel writes could race.
 *
 * Phases removed from `phases` (present before, missing now) are left
 * as-is rather than deleted — any item still pointing at one just
 * shows ungrouped once nothing references that phase anymore. Not
 * cleaning those up is a deliberate v1 simplification, not a bug.
 */
export async function resolveQuotePhases(
  supabase: SupabaseClient,
  accountId: string,
  quoteId: string,
  phases: RawPhase[],
): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const position = phase.position ?? i;
    if (phase.id) {
      await supabase
        .from('quote_phases')
        .update({ name: phase.name, position })
        .eq('id', phase.id)
        .eq('quote_id', quoteId);
      ids.push(phase.id);
    } else {
      const { data, error } = await supabase
        .from('quote_phases')
        .insert({ account_id: accountId, quote_id: quoteId, name: phase.name, position })
        .select('id')
        .single();
      if (error || !data) throw new Error('Failed to create quote phase');
      ids.push(data.id as string);
    }
  }
  return ids;
}
