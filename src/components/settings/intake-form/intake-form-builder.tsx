"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Save } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useCan } from "@/hooks/use-can";
import { Button } from "@/components/ui/button";
import { IntakeFormRenderer } from "@/components/public-booking/intake-form-renderer";
import { PageList } from "./page-list";
import { FieldList } from "./field-list";
import type { IntakeFormConfig, IntakeFormPage } from "@/lib/intake-forms/types";

function newPageId(): string {
  return crypto.randomUUID();
}

function emptyConfig(): IntakeFormConfig {
  return { pages: [] };
}

/**
 * Root of the per-doctor intake-form builder (Ajustes → Agenda →
 * médico → Formulario de admisión). Whole-blob save straight to
 * `doctors.intake_form_config`, same pattern as
 * `booking-page-editor.tsx` — including its fix: re-reads the row the
 * UPDATE actually returns instead of trusting local state, so an
 * RLS-blocked write (0 rows, no Postgrest error) surfaces as a real
 * error instead of a false "saved" toast.
 */
export function IntakeFormBuilder({
  doctorId,
  initialConfig,
}: {
  doctorId: string;
  initialConfig: IntakeFormConfig | null;
}) {
  const supabase = createClient();
  const canEdit = useCan("edit-settings");

  const [config, setConfig] = useState<IntakeFormConfig>(
    initialConfig && initialConfig.pages?.length > 0 ? initialConfig : emptyConfig(),
  );
  const [selectedPageId, setSelectedPageId] = useState<string | null>(config.pages[0]?.id ?? null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedPage = config.pages.find((p) => p.id === selectedPageId) ?? config.pages[0] ?? null;

  function setPages(updater: (pages: IntakeFormPage[]) => IntakeFormPage[]) {
    setConfig((prev) => ({ pages: updater(prev.pages) }));
  }

  function addPage() {
    const page: IntakeFormPage = {
      id: newPageId(),
      title: `Página ${config.pages.length + 1}`,
      fields: [],
      jumpRules: [],
    };
    setPages((pages) => [...pages, page]);
    setSelectedPageId(page.id);
  }

  function updatePage(pageId: string, patch: Partial<IntakeFormPage>) {
    setPages((pages) => pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p)));
  }

  function removePage(pageId: string) {
    setPages((pages) => {
      const remaining = pages.filter((p) => p.id !== pageId);
      // Drop any other page's jump rules that pointed at the removed page.
      return remaining.map((p) => ({ ...p, jumpRules: p.jumpRules.filter((r) => r.targetPageId !== pageId) }));
    });
    setSelectedPageId((prev) => (prev === pageId ? null : prev));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("doctors")
        .update({ intake_form_config: config })
        .eq("id", doctorId)
        .select("intake_form_config")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error("No se guardó ningún cambio — verifica que tengas permisos de administrador.");
      }
      toast.success("Formulario guardado");
    } catch (err) {
      console.error("Save intake form error:", err);
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el formulario");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setPreview((v) => !v)}>
          {preview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {preview ? "Editar" : "Vista previa"}
        </Button>
        {canEdit && (
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Guardar
          </Button>
        )}
      </div>

      {preview ? (
        config.pages.length === 0 || config.pages.every((p) => p.fields.length === 0) ? (
          <p className="text-sm text-muted-foreground">
            Agrega al menos una página con una pregunta para ver la vista previa.
          </p>
        ) : (
          <div className="max-w-md rounded-xl border border-border bg-card p-5">
            <IntakeFormRenderer
              config={config}
              onComplete={() => toast.success("Fin del formulario — así lo verá el paciente.")}
            />
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
          <PageList
            pages={config.pages}
            selectedPageId={selectedPage?.id ?? null}
            onSelect={setSelectedPageId}
            onReorder={(pages) => setPages(() => pages)}
            onAdd={addPage}
            onRename={(pageId, title) => updatePage(pageId, { title })}
            onRemove={removePage}
            disabled={!canEdit}
          />
          {selectedPage ? (
            <FieldList
              page={selectedPage}
              allPages={config.pages}
              onChangeFields={(fields) => updatePage(selectedPage.id, { fields })}
              onChangeJumpRules={(jumpRules) => updatePage(selectedPage.id, { jumpRules })}
              disabled={!canEdit}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Crea una página para empezar a agregar preguntas.</p>
          )}
        </div>
      )}
    </div>
  );
}
