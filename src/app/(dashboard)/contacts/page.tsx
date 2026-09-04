'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  Plus,
  Upload,
  Loader2,
  Users,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Filter,
} from 'lucide-react';
import { ContactForm } from '@/components/contacts/contact-form';
import { ImportModal } from '@/components/contacts/import-modal';
import { CustomFieldsManager } from '@/components/contacts/custom-fields-manager';
import { PageHeader } from '@/components/layout/page-header';
import { useCan } from '@/hooks/use-can';
import { useAuth } from '@/hooks/use-auth';
import { GatedButton } from '@/components/ui/gated-button';
import { usePatientsList, type PatientRow } from '@/hooks/use-patients-list';
import { patientAvatarTint, patientInitials } from '@/lib/patient-avatar';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

type TabKey = 'all' | 'active' | 'balance' | 'no_appointment';

const WEEKDAY_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Verde+negrita si es hoy; texto normal para cualquier otra fecha futura —
 *  el color queda reservado para "Sin cita" (llamada de atención), no para
 *  cada cita programada. */
function formatNextAppointment(
  iso: string,
  locale: string,
  todayLabel: string,
): { label: string; className: string } {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(locale === 'en' ? 'en-US' : 'es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (d.toDateString() === now.toDateString()) {
    return {
      label: `${todayLabel} · ${time}`,
      className: 'font-semibold text-emerald-600 dark:text-emerald-400',
    };
  }
  const weekdays = locale === 'en' ? WEEKDAY_EN : WEEKDAY_ES;
  return { label: `${weekdays[d.getDay()]} ${d.getDate()} · ${time}`, className: 'text-foreground' };
}

function formatBalance(row: PatientRow, currency: string): { label: string; className: string } {
  if (row.balance <= 0) return { label: '—', className: 'text-muted-foreground' };
  return {
    label: formatCurrency(row.balance, currency),
    className: row.hasOverdue
      ? 'font-semibold text-red-600 dark:text-red-400'
      : 'font-semibold text-amber-600 dark:text-amber-500',
  };
}

function patientSubtitle(row: PatientRow, t: ReturnType<typeof useTranslations>): string | null {
  const parts: string[] = [];
  if (row.age !== null) parts.push(t('yearsOld', { age: row.age }));
  if (row.patientGroup) parts.push(row.patientGroup);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export default function ContactsPage() {
  const t = useTranslations('Contacts.page');
  const locale = useLocale();
  const router = useRouter();
  const canEdit = useCan('send-messages');
  const canEditSettings = useCan('edit-settings');
  const { defaultCurrency } = useAuth();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabKey>('all');
  const [treatmentFilter, setTreatmentFilter] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);

  const { rows, loading, reload } = usePatientsList(search);

  const treatmentOptions = useMemo(() => {
    if (!rows) return [];
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.treatmentLabel) set.add(r.treatmentLabel);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const byTreatment = useMemo(() => {
    if (!rows) return [];
    if (treatmentFilter.length === 0) return rows;
    return rows.filter((r) => r.treatmentLabel && treatmentFilter.includes(r.treatmentLabel));
  }, [rows, treatmentFilter]);

  const counts = useMemo(
    () => ({
      all: byTreatment.length,
      active: byTreatment.filter((r) => r.isActive).length,
      balance: byTreatment.filter((r) => r.balance > 0).length,
      noAppointment: byTreatment.filter((r) => !r.nextAppointment).length,
    }),
    [byTreatment],
  );

  const tabRows = useMemo(() => {
    switch (tab) {
      case 'active':
        return byTreatment.filter((r) => r.isActive);
      case 'balance':
        return byTreatment.filter((r) => r.balance > 0);
      case 'no_appointment':
        return byTreatment.filter((r) => !r.nextAppointment);
      default:
        return byTreatment;
    }
  }, [byTreatment, tab]);

  const totalCount = tabRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageRows = tabRows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;
  const hasActiveFilters = search.trim().length > 0 || treatmentFilter.length > 0 || tab !== 'all';

  function openDetail(id: string) {
    router.push(`/contacts/${id}`);
  }

  function toggleTreatment(name: string) {
    setTreatmentFilter((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
    setPage(0);
  }

  function selectTab(key: TabKey) {
    setTab(key);
    setPage(0);
  }

  function clearTreatmentFilter() {
    setTreatmentFilter([]);
    setPage(0);
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: t('tabAll'), count: counts.all },
    { key: 'active', label: t('tabActive'), count: counts.active },
    { key: 'balance', label: t('tabBalance'), count: counts.balance },
    { key: 'no_appointment', label: t('tabNoAppointment'), count: counts.noAppointment },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={
          rows === null ? undefined : counts.all > 0 ? t('subtitle', { count: counts.all, balanceCount: counts.balance }) : t('subtitleZero')
        }
      />

      <div className="relative w-full max-w-xs">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder={t('searchPlaceholder')}
          className="border-border bg-card pl-8 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => selectTab(key)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                tab === key
                  ? 'border-primary/50 bg-primary/5 text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-muted',
              )}
            >
              {label} · {count}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEditSettings && (
            <Button
              variant="outline"
              onClick={() => setCustomFieldsOpen(true)}
              className="border-border text-muted-foreground hover:bg-muted"
              title={t('customFieldsBtn')}
            >
              <SlidersHorizontal className="size-4" />
              <span className="sr-only sm:not-sr-only">{t('customFieldsBtn')}</span>
            </Button>
          )}

          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="border-border text-muted-foreground hover:bg-muted"
                />
              }
            >
              <Filter className="size-4" />
              {t('filtersBtn')}
              {treatmentFilter.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {treatmentFilter.length}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-sm font-medium text-popover-foreground">
                  {t('filterByTreatment')}
                </span>
                {treatmentFilter.length > 0 && (
                  <button
                    onClick={clearTreatmentFilter}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t('clearAll')}
                  </button>
                )}
              </div>
              {treatmentOptions.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {t('noTreatmentsYet')}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto py-1">
                  {treatmentOptions.map((name) => (
                    <label
                      key={name}
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={treatmentFilter.includes(name)}
                        onCheckedChange={() => toggleTreatment(name)}
                        aria-label={`Filter by ${name}`}
                      />
                      <span className="truncate text-sm text-popover-foreground">{name}</span>
                    </label>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          <GatedButton
            variant="outline"
            canAct={canEdit}
            gateReason="add or import contacts"
            onClick={() => setImportOpen(true)}
            className="border-border text-muted-foreground hover:bg-muted"
          >
            <Upload className="size-4" />
            {t('importBtn')}
          </GatedButton>

          <GatedButton
            canAct={canEdit}
            gateReason="add or import contacts"
            onClick={() => setFormOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" />
            {t('addContactBtn')}
          </GatedButton>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">{t('tableColumns.patient')}</TableHead>
              <TableHead className="text-muted-foreground">{t('tableColumns.phone')}</TableHead>
              <TableHead className="text-muted-foreground">{t('tableColumns.nextAppointment')}</TableHead>
              <TableHead className="hidden text-muted-foreground md:table-cell">
                {t('tableColumns.treatment')}
              </TableHead>
              <TableHead className="text-right text-muted-foreground">{t('tableColumns.balance')}</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading || rows === null ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">{t('loading')}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : pageRows.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {hasActiveFilters ? t('noContactsMatch') : t('noContactsYet')}
                    </p>
                    {!hasActiveFilters && (
                      <GatedButton
                        canAct={canEdit}
                        gateReason="add or import contacts"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormOpen(true)}
                        className="mt-2 border-border text-muted-foreground hover:bg-muted"
                      >
                        <Plus className="size-3.5" />
                        {t('addFirstContact')}
                      </GatedButton>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => {
                const c = row.contact;
                const name = c.name?.trim() || '';
                const subtitle = patientSubtitle(row, t);
                const next = row.nextAppointment
                  ? formatNextAppointment(row.nextAppointment.startAt, locale, t('todayLabel'))
                  : { label: t('noAppointment'), className: 'font-medium text-amber-600 dark:text-amber-500' };
                const balance = formatBalance(row, defaultCurrency);
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer border-border hover:bg-muted/50"
                    onClick={() => openDetail(c.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                            patientAvatarTint(name || c.phone),
                          )}
                          aria-hidden="true"
                        >
                          {patientInitials(name || c.phone)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {name || <span className="italic text-muted-foreground">{t('unnamed')}</span>}
                          </p>
                          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.phone}</TableCell>
                    <TableCell className={cn('text-sm', next.className)}>{next.label}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {row.treatmentLabel ?? '—'}
                    </TableCell>
                    <TableCell className={cn('text-right text-sm tabular-nums', balance.className)}>
                      {balance.label}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <ChevronRight className="size-4" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {t('showingPagination', { count: pageRows.length, total: totalCount })}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={!hasPrev}
                onClick={() => setPage((p) => p - 1)}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-2 text-xs text-muted-foreground">
                {t('pageCount', { page: page + 1, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={() => void reload()}
        onViewExisting={(id) => {
          setFormOpen(false);
          openDetail(id);
        }}
      />

      <ImportModal open={importOpen} onOpenChange={setImportOpen} onImported={() => void reload()} />

      {canEditSettings && (
        <CustomFieldsManager open={customFieldsOpen} onOpenChange={setCustomFieldsOpen} />
      )}
    </div>
  );
}
