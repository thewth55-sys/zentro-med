'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/hooks/use-auth';
import { canEditSettings } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsPanelHead } from './settings-panel-head';
import type { PaymentReminderConfig, MessageTemplate, PaymentReminderVariableMapping, PaymentReminderVariableToken } from '@/types';

const REMINDER_TOKENS: PaymentReminderVariableToken[] = [
  'contact_name',
  'account_name',
  'invoice_number',
  'amount_due',
  'due_date',
];

const NO_TEMPLATE = '__none__';

function extractPlaceholders(bodyText: string): number[] {
  const found = new Set<number>();
  for (const match of bodyText.matchAll(/\{\{(\d+)\}\}/g)) {
    found.add(Number(match[1]));
  }
  return Array.from(found).sort((a, b) => a - b);
}

/**
 * "Recordatorios de pago" — mismo patrón que
 * appointment-reminders-config.tsx, sin `hours_before`: los
 * recordatorios de "Nueva factura" se programan siempre a +7 y +15
 * días de la fecha de emisión (ver el checkbox correspondiente), no
 * a un offset configurable.
 */
export function PaymentRemindersConfig() {
  const t = useTranslations('Settings.paymentReminders');
  const { accountId, accountRole, loading: authLoading, profileLoading } = useAuth();
  const canEdit = accountRole ? canEditSettings(accountRole) : false;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const loadedAccountIdRef = useRef<string | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [templateKey, setTemplateKey] = useState('');
  const [variableMapping, setVariableMapping] = useState<Record<string, PaymentReminderVariableMapping>>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [configRes, templatesRes] = await Promise.all([
        fetch('/api/payment-reminders/config').then((r) => r.json()),
        supabase.from('message_templates').select('*').eq('status', 'APPROVED').order('name'),
      ]);

      setTemplates((templatesRes.data as MessageTemplate[] | null) ?? []);

      const config: PaymentReminderConfig | null = configRes.config ?? null;
      if (config) {
        setIsActive(config.is_active);
        setTemplateKey(
          config.template_name && config.template_language
            ? `${config.template_name}::${config.template_language}`
            : '',
        );
        setVariableMapping(config.variable_mapping ?? {});
      }
    } catch (err) {
      console.error('fetchAll error:', err);
      toast.error(t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!accountId) {
      setLoading(false);
      return;
    }
    if (loadedAccountIdRef.current === accountId) return;
    loadedAccountIdRef.current = accountId;
    fetchAll();
  }, [authLoading, profileLoading, accountId, fetchAll]);

  const selectedTemplate = useMemo(() => {
    if (!templateKey) return null;
    const [name, language] = templateKey.split('::');
    return templates.find((tmpl) => tmpl.name === name && (tmpl.language ?? 'en_US') === language) ?? null;
  }, [templateKey, templates]);

  const placeholders = useMemo(
    () => (selectedTemplate ? extractPlaceholders(selectedTemplate.body_text) : []),
    [selectedTemplate],
  );

  function updateMapping(placeholder: number, entry: PaymentReminderVariableMapping) {
    setVariableMapping((prev) => ({ ...prev, [String(placeholder)]: entry }));
  }

  async function handleSave() {
    if (isActive && !selectedTemplate) {
      toast.error(t('selectTemplateFirst'));
      return;
    }

    const mappingToSave: Record<string, PaymentReminderVariableMapping> = {};
    for (const n of placeholders) {
      mappingToSave[String(n)] = variableMapping[String(n)] ?? { type: 'token', value: 'contact_name' };
    }

    try {
      setSaving(true);
      const [name, language] = templateKey ? templateKey.split('::') : [null, null];
      const res = await fetch('/api/payment-reminders/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: isActive,
          template_name: name,
          template_language: language,
          variable_mapping: mappingToSave,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t('saveFailed'));
        return;
      }
      toast.success(t('saveSuccess'));
      await fetchAll();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(t('saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="animate-in fade-in-50 duration-200">
        <SettingsPanelHead title={t('title')} description={t('description')} />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  const disabled = !canEdit || saving;

  return (
    <section className="animate-in fade-in-50 duration-200 space-y-6">
      <SettingsPanelHead title={t('title')} description={t('description')} />

      {!canEdit && (
        <Alert className="bg-card border-border">
          <AlertDescription className="text-muted-foreground">{t('adminOnlyHint')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">{t('sectionTitle')}</CardTitle>
          <CardDescription className="text-muted-foreground">{t('sectionDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-foreground">{t('enable')}</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">{t('templateLabel')}</Label>
            {templates.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('noApprovedTemplates')}</p>
            ) : (
              <Select
                value={templateKey || NO_TEMPLATE}
                onValueChange={(v) => setTemplateKey(!v || v === NO_TEMPLATE ? '' : v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEMPLATE}>{t('selectTemplate')}</SelectItem>
                  {templates.map((tmpl) => {
                    const lang = tmpl.language ?? 'en_US';
                    return (
                      <SelectItem key={tmpl.id} value={`${tmpl.name}::${lang}`}>
                        {tmpl.name} ({lang})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedTemplate && (
            <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{selectedTemplate.body_text}</p>
              {placeholders.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('noVariables')}</p>
              ) : (
                <div className="space-y-3">
                  {placeholders.map((n) => {
                    const entry = variableMapping[String(n)] ?? { type: 'token' as const, value: 'contact_name' as const };
                    return (
                      <div key={n} className="grid gap-2 sm:grid-cols-[auto_1fr_1fr] sm:items-center">
                        <span className="text-sm font-mono text-muted-foreground">{`{{${n}}}`}</span>
                        <Select
                          value={entry.type}
                          onValueChange={(v) =>
                            updateMapping(
                              n,
                              v === 'static'
                                ? { type: 'static', value: entry.type === 'static' ? entry.value : '' }
                                : { type: 'token', value: 'contact_name' },
                            )
                          }
                          disabled={disabled}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="token">{t('mappingTypeToken')}</SelectItem>
                            <SelectItem value="static">{t('mappingTypeStatic')}</SelectItem>
                          </SelectContent>
                        </Select>
                        {entry.type === 'token' ? (
                          <Select
                            value={entry.value}
                            onValueChange={(v) => updateMapping(n, { type: 'token', value: v as PaymentReminderVariableToken })}
                            disabled={disabled}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {REMINDER_TOKENS.map((token) => (
                                <SelectItem key={token} value={token}>
                                  {t(`token.${token}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={entry.value}
                            onChange={(e) => updateMapping(n, { type: 'static', value: e.target.value })}
                            disabled={disabled}
                            className="bg-muted border-border text-foreground"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={disabled} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('save')
          )}
        </Button>
      </div>
    </section>
  );
}
