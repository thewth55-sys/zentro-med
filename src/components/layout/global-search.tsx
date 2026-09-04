"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarClock, Loader2, Receipt, Search, UsersRound } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SearchPatient {
  id: string;
  name: string | null;
  phone: string;
}

interface SearchAppointment {
  id: string;
  contact_id: string;
  start_at: string;
  status: string;
  contact?: { name: string | null } | { name: string | null }[] | null;
  service_type?: { name: string } | { name: string }[] | null;
}

interface SearchInvoice {
  id: string;
  contact_id: string;
  invoice_number: string;
  total: number;
  status: string;
  contact?: { name: string | null } | { name: string | null }[] | null;
}

interface SearchResults {
  patients: SearchPatient[];
  appointments: SearchAppointment[];
  invoices: SearchInvoice[];
}

const EMPTY_RESULTS: SearchResults = { patients: [], appointments: [], invoices: [] };

function relationName(rel: { name: string | null } | { name: string | null }[] | null | undefined): string {
  if (!rel) return "";
  const r = Array.isArray(rel) ? rel[0] : rel;
  return r?.name ?? "";
}

/** Una entrada aplanada de la lista de resultados — para poder navegar
 *  con flechas/Enter sin importar a qué grupo pertenece cada una. */
interface FlatResult {
  key: string;
  href: string;
  icon: typeof UsersRound;
  primary: string;
  secondary: string;
}

const dateFormatter = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });

export function GlobalSearch() {
  const t = useTranslations("GlobalSearch");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestSeq = useRef(0);

  // ⌘K / Ctrl+K abre la búsqueda desde cualquier pantalla del dashboard.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(EMPTY_RESULTS);
      setHighlight(0);
      // El Dialog anima su entrada — enfocar en el próximo tick evita
      // que el foco se pierda contra ese montaje.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const runSearch = useCallback(async (term: string) => {
    const seq = ++requestSeq.current;
    if (term.trim().length < 2) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      const data = await res.json().catch(() => EMPTY_RESULTS);
      if (seq !== requestSeq.current) return;
      setResults({
        patients: data.patients ?? [],
        appointments: data.appointments ?? [],
        invoices: data.invoices ?? [],
      });
    } catch {
      if (seq === requestSeq.current) setResults(EMPTY_RESULTS);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => void runSearch(query), 250);
    return () => clearTimeout(handle);
  }, [query, runSearch]);

  const flatResults: FlatResult[] = [
    ...results.patients.map((p) => ({
      key: `patient-${p.id}`,
      href: `/contacts/${p.id}`,
      icon: UsersRound,
      primary: p.name || p.phone,
      secondary: p.phone,
    })),
    ...results.appointments.map((a) => ({
      key: `appointment-${a.id}`,
      href: `/contacts/${a.contact_id}?tab=appointments`,
      icon: CalendarClock,
      primary: relationName(a.contact) || t("unnamedPatient"),
      secondary: [dateFormatter.format(new Date(a.start_at)), relationName(a.service_type)].filter(Boolean).join(" · "),
    })),
    ...results.invoices.map((inv) => ({
      key: `invoice-${inv.id}`,
      href: `/contacts/${inv.contact_id}?tab=billing`,
      icon: Receipt,
      primary: inv.invoice_number,
      secondary: relationName(inv.contact) || t("unnamedPatient"),
    })),
  ];

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (flatResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => (i + 1) % flatResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => (i - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatResults[highlight];
      if (target) go(target.href);
    }
  }

  const hasQuery = query.trim().length >= 2;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted sm:flex sm:w-64 lg:w-80"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">{t("placeholder")}</span>
        <kbd className="hidden shrink-0 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline-block">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("placeholder")}
        className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
      >
        <Search className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="top-[15%] max-w-lg translate-y-0 gap-0 p-0 sm:max-w-xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onInputKeyDown}
              placeholder={t("placeholder")}
              className="h-8 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!hasQuery ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("typeToSearch")}</p>
            ) : !loading && flatResults.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("noResults", { term: query })}</p>
            ) : (
              <>
                {results.patients.length > 0 && (
                  <ResultGroup label={t("groupPatients")} start={0} results={flatResults} highlight={highlight} onPick={go} count={results.patients.length} />
                )}
                {results.appointments.length > 0 && (
                  <ResultGroup
                    label={t("groupAppointments")}
                    start={results.patients.length}
                    results={flatResults}
                    highlight={highlight}
                    onPick={go}
                    count={results.appointments.length}
                  />
                )}
                {results.invoices.length > 0 && (
                  <ResultGroup
                    label={t("groupInvoices")}
                    start={results.patients.length + results.appointments.length}
                    results={flatResults}
                    highlight={highlight}
                    onPick={go}
                    count={results.invoices.length}
                  />
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResultGroup({
  label,
  start,
  count,
  results,
  highlight,
  onPick,
}: {
  label: string;
  start: number;
  count: number;
  results: FlatResult[];
  highlight: number;
  onPick: (href: string) => void;
}) {
  const slice = results.slice(start, start + count);
  return (
    <div className="mb-1">
      <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {slice.map((r, i) => {
        const index = start + i;
        const Icon = r.icon;
        return (
          <button
            key={r.key}
            type="button"
            onClick={() => onPick(r.href)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
              index === highlight ? "bg-primary/10 text-foreground" : "text-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{r.primary}</span>
              <span className="block truncate text-xs text-muted-foreground">{r.secondary}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
