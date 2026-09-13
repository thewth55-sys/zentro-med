'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Contact, CustomField } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Eye, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

type VariableType = 'static' | 'field' | 'custom_field';

interface VariableMapping {
  type: VariableType;
  value: string;
}

interface Step3EmailProps {
  subject: string;
  bodyText: string;
  variables: Record<string, VariableMapping>;
  onUpdate: (variables: Record<string, VariableMapping>) => void;
  onNext: () => void;
  onBack: () => void;
}

const contactFields = [
  { value: 'name', labelKey: 'name' },
  { value: 'phone', labelKey: 'phone' },
  { value: 'email', labelKey: 'email' },
];

const SAMPLE_CONTACT: Contact = {
  id: 'sample',
  user_id: '',
  account_id: '',
  name: 'John Doe',
  phone: '+1234567890',
  email: 'john@example.com',
  company: 'Acme Corp',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Email channel's step 3 — same {{n}} merge-tag mapping mechanism as
 * WhatsApp's Step3Personalize, applied to the free-text subject+body
 * instead of a Meta template's body_text. No media-header handling
 * (not applicable to email).
 */
export function Step3EmailPersonalize({
  subject,
  bodyText,
  variables,
  onUpdate,
  onNext,
  onBack,
}: Step3EmailProps) {
  const t = useTranslations('Broadcasts.wizard');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [firstContact, setFirstContact] = useState<Contact | null>(null);
  const [firstContactCustomValues, setFirstContactCustomValues] = useState<Map<string, string>>(new Map());
  const [loadingPreview, setLoadingPreview] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [fieldsRes, contactRes] = await Promise.all([
        supabase.from('custom_fields').select('*').order('field_name'),
        supabase.from('contacts').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (cancelled) return;

      setCustomFields(fieldsRes.data ?? []);
      setLoadingFields(false);

      const contact = contactRes.data ?? null;
      setFirstContact(contact);

      if (contact) {
        const { data: customVals } = await supabase
          .from('contact_custom_values')
          .select('custom_field_id, value')
          .eq('contact_id', contact.id);
        if (!cancelled) {
          const map = new Map<string, string>();
          for (const row of customVals ?? []) map.set(row.custom_field_id, row.value ?? '');
          setFirstContactCustomValues(map);
        }
      }
      setLoadingPreview(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const combinedText = `${subject}\n${bodyText}`;

  const placeholders = useMemo(() => {
    const matches = combinedText.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches)].sort();
  }, [combinedText]);

  const unmappedKeys = useMemo(() => {
    const missing: string[] = [];
    for (const placeholder of placeholders) {
      const key = placeholder.replace(/^\{\{|\}\}$/g, '');
      const mapping = variables[key];
      if (!mapping || !mapping.value?.trim()) missing.push(placeholder);
    }
    return missing;
  }, [placeholders, variables]);

  function updateVariable(key: string, patch: Partial<VariableMapping>) {
    const current = variables[key] ?? { type: 'static' as VariableType, value: '' };
    onUpdate({ ...variables, [key]: { ...current, ...patch } });
  }

  const resolve = useCallback(
    (text: string): string => {
      const contact = firstContact ?? SAMPLE_CONTACT;
      const customValues = firstContact ? firstContactCustomValues : new Map<string, string>();
      let result = text;
      for (const placeholder of placeholders) {
        const key = placeholder.replace(/^\{\{|\}\}$/g, '');
        const mapping = variables[key];
        let replacement = placeholder;
        if (mapping) {
          if (mapping.type === 'static' && mapping.value) {
            replacement = mapping.value;
          } else if (mapping.type === 'field' && mapping.value) {
            const fieldMap: Record<string, string | undefined> = {
              name: contact.name,
              phone: contact.phone,
              email: contact.email,
              company: contact.company,
            };
            replacement = fieldMap[mapping.value] ?? placeholder;
          } else if (mapping.type === 'custom_field' && mapping.value) {
            replacement = customValues.get(mapping.value) || placeholder;
          }
        }
        result = result.replaceAll(placeholder, replacement);
      }
      return result;
    },
    [placeholders, variables, firstContact, firstContactCustomValues],
  );

  const previewSubject = useMemo(() => resolve(subject), [resolve, subject]);
  const previewBody = useMemo(() => resolve(bodyText), [resolve, bodyText]);
  const previewLabel = firstContact ? firstContact.name || firstContact.phone : t('personalize.previewSample');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('personalize.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('personalize.subtitle')}</p>
      </div>

      {placeholders.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">{t('personalize.noPreview')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {placeholders.map((placeholder) => {
            const key = placeholder.replace(/^\{\{|\}\}$/g, '');
            const mapping = variables[key] ?? { type: 'static', value: '' };

            return (
              <div key={placeholder} className="rounded-xl border border-border bg-card/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary">
                    {placeholder}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('personalize.type')}</label>
                    <Select value={mapping.type} onValueChange={(val) => updateVariable(key, { type: val as VariableType, value: '' })}>
                      <SelectTrigger className="w-full border-border bg-muted text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-popover">
                        <SelectItem value="static">{t('personalize.typeStatic')}</SelectItem>
                        <SelectItem value="field">{t('personalize.typeContact')}</SelectItem>
                        <SelectItem value="custom_field">{t('personalize.typeCustom')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      {mapping.type === 'static' ? t('personalize.staticValue') : t('personalize.contactField')}
                    </label>
                    {mapping.type === 'static' ? (
                      <Input
                        value={mapping.value}
                        onChange={(e) => updateVariable(key, { value: e.target.value })}
                        placeholder="Enter value..."
                        className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                      />
                    ) : mapping.type === 'field' ? (
                      <Select value={mapping.value || undefined} onValueChange={(val) => updateVariable(key, { value: val || '' })}>
                        <SelectTrigger className="w-full border-border bg-muted text-foreground">
                          <SelectValue placeholder={t('personalize.selectContactField')} />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-popover">
                          {contactFields.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {t(`personalize.fieldMap.${field.labelKey}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select value={mapping.value || undefined} onValueChange={(val) => updateVariable(key, { value: val || '' })}>
                        <SelectTrigger className="w-full border-border bg-muted text-foreground">
                          <SelectValue
                            placeholder={loadingFields ? 'Loading…' : customFields.length === 0 ? 'No custom fields' : 'Select custom field…'}
                          />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-popover">
                          {customFields.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.field_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium text-foreground">{t('personalize.preview')}</p>
          <span className="text-xs text-muted-foreground">({previewLabel})</span>
          {loadingPreview && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="mb-2 text-sm font-semibold text-foreground">{previewSubject}</p>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{previewBody}</p>
        </div>
      </div>

      {unmappedKeys.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Map every placeholder before continuing — still missing{' '}
          <span className="font-mono font-semibold">{unmappedKeys.join(', ')}</span>.
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={onBack} className="border-border text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </Button>
        <Button
          onClick={onNext}
          disabled={unmappedKeys.length > 0}
          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {t('next')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
