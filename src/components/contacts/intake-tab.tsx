'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import type { IntakeAnswerRecord } from '@/lib/intake-forms/types';

interface IntakeSubmission {
  id: string;
  submitted_at: string;
  answers: IntakeAnswerRecord[];
}

const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Read-only history of intake-form submissions for this contact —
 * same self-fetching-sub-tab shape as MedicalTab/ConsentFormsTab.
 * Queries Supabase directly (RLS already scopes reads to account
 * members, see migration 104) rather than a bespoke API route,
 * matching the newer settings-component convention.
 */
export function IntakeTab({ contactId }: { contactId: string }) {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<IntakeSubmission[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('intake_form_submissions')
        .select('id, submitted_at, answers')
        .eq('contact_id', contactId)
        .order('submitted_at', { ascending: false });
      if (!cancelled) {
        setSubmissions((data ?? []) as IntakeSubmission[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <ClipboardList className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Sin respuestas de formulario de admisión — este paciente ya existía en tus contactos cuando
          reservó, o no llenó ningún formulario.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission, index) => (
        <details
          key={submission.id}
          open={index === 0}
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-foreground">
            Formulario de admisión — {dateFormatter.format(new Date(submission.submitted_at))}
          </summary>
          <div className="space-y-4 border-t border-border p-3">
            {groupByPage(submission.answers).map(([pageTitle, answers]) => (
              <div key={pageTitle} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {pageTitle}
                </p>
                <div className="space-y-2">
                  {answers.map((answer) => (
                    <div key={answer.field_id} className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{answer.field_label}</p>
                      <p className="text-sm whitespace-pre-wrap text-foreground">{answer.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function groupByPage(answers: IntakeAnswerRecord[]): [string, IntakeAnswerRecord[]][] {
  const order: string[] = [];
  const byPage = new Map<string, IntakeAnswerRecord[]>();
  for (const answer of answers) {
    if (!byPage.has(answer.page_title)) {
      byPage.set(answer.page_title, []);
      order.push(answer.page_title);
    }
    byPage.get(answer.page_title)!.push(answer);
  }
  return order.map((title) => [title, byPage.get(title)!]);
}
