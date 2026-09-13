'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Step1EmailProps {
  subject: string;
  onSubjectChange: (subject: string) => void;
  bodyText: string;
  onBodyTextChange: (bodyText: string) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Email channel's step 1 — plain text subject + body composer instead
 * of a Meta template picker (there's no such thing as an "approved
 * email template" here; the content IS the message). Deliberately
 * plain text with {{n}} merge tags, no rich/WYSIWYG editor — reduced
 * scope for this first pass at email broadcasts.
 */
export function Step1EmailCompose({
  subject,
  onSubjectChange,
  bodyText,
  onBodyTextChange,
  onNext,
  onBack,
}: Step1EmailProps) {
  const t = useTranslations('Broadcasts.wizard');
  const canContinue = subject.trim().length > 0 && bodyText.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Mail className="h-4 w-4 text-primary" />
          {t('emailCompose.title')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('emailCompose.subtitle')}</p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card/50 p-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t('emailCompose.subjectLabel')}
          </label>
          <Input
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder={t('emailCompose.subjectPlaceholder')}
            className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t('emailCompose.bodyLabel')}
          </label>
          <Textarea
            value={bodyText}
            onChange={(e) => onBodyTextChange(e.target.value)}
            rows={8}
            placeholder={t('emailCompose.bodyPlaceholder')}
            className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">{t('emailCompose.bodyHint')}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={onBack} className="border-border text-muted-foreground">
          {t('back')}
        </Button>
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {t('next')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
