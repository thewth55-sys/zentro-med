'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { MessageTemplate } from '@/types';
import { Step1ChooseTemplate } from '@/components/broadcasts/step1-choose-template';
import { Step1EmailCompose } from '@/components/broadcasts/step1-email-compose';
import { Step2SelectAudience } from '@/components/broadcasts/step2-select-audience';
import { Step3Personalize } from '@/components/broadcasts/step3-personalize';
import { Step3EmailPersonalize } from '@/components/broadcasts/step3-email-personalize';
import { Step4ScheduleSend } from '@/components/broadcasts/step4-schedule-send';
import { useBroadcastSending } from '@/hooks/use-broadcast-sending';
import { Check, Mail, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

const steps = [
  { label: 'template', key: 'template' },
  { label: 'audience', key: 'audience' },
  { label: 'personalize', key: 'personalize' },
  { label: 'send', key: 'send' },
] as const;

type Channel = 'whatsapp' | 'email';
type VariableMapping = { type: 'static' | 'field' | 'custom_field'; value: string };

export default function NewBroadcastPage() {
  const router = useRouter();
  const t = useTranslations('Broadcasts.new');
  const { accountId } = useAuth();
  const { createAndSendBroadcast, createAndSendEmailBroadcast, isProcessing, progress } = useBroadcastSending();

  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [currentStep, setCurrentStep] = useState(0);

  // WhatsApp channel state
  const [template, setTemplate] = useState<MessageTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, VariableMapping>>({});
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');

  // Email channel state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailVariables, setEmailVariables] = useState<Record<string, VariableMapping>>({});

  const [audience, setAudience] = useState<{
    type: 'all' | 'tags' | 'custom_field' | 'csv';
    tagIds?: string[];
    customField?: {
      fieldId: string;
      operator: 'is' | 'is_not' | 'contains';
      value: string;
    };
    csvContacts?: { phone: string; name?: string }[];
    excludeTagIds?: string[];
  }>({ type: 'all' });
  const [name, setName] = useState('');

  async function handleSend() {
    try {
      let broadcastId: string;
      if (channel === 'email') {
        broadcastId = await createAndSendEmailBroadcast({
          name,
          subject: emailSubject,
          bodyText: emailBody,
          audience,
          variables: emailVariables,
        });
      } else {
        if (!template) return;
        broadcastId = await createAndSendBroadcast({
          name,
          template,
          audience,
          variables,
          headerMediaUrl,
        });
      }
      router.push(`/broadcasts/${broadcastId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Broadcast failed';
      console.error('Broadcast failed:', err);
      toast.error(message);
    }
  }

  /**
   * Writes a draft broadcast row — no recipients, no sending. See
   * createAndSendBroadcast's own comment for why the in-progress
   * audience/variable config isn't fully round-tripped back into the
   * wizard on resume.
   */
  async function handleSaveDraft() {
    const contentReady = channel === 'email' ? emailSubject.trim() && emailBody.trim() : !!template;
    if (!contentReady || !name.trim()) {
      toast.error(t('toastGiveName'));
      return;
    }
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      toast.error(t('toastNotSignedIn'));
      return;
    }
    if (!accountId) {
      toast.error(t('toastNotLinked'));
      return;
    }

    const { error } = await supabase.from('broadcasts').insert({
      user_id: user.id,
      account_id: accountId,
      name: name.trim(),
      channel,
      template_name: channel === 'email' ? emailSubject : template!.name,
      template_language: channel === 'email' ? undefined : (template!.language ?? 'en_US'),
      template_variables: channel === 'email' ? emailVariables : variables,
      audience_filter: {
        type: audience.type,
        tagIds: audience.tagIds,
      },
      status: 'draft',
      total_recipients: 0,
      sent_count: 0,
      delivered_count: 0,
      read_count: 0,
      replied_count: 0,
      failed_count: 0,
    });

    if (error) {
      toast.error(t('toastFailedDraft', { error: error.message }));
      return;
    }
    toast.success(t('toastDraftSaved'));
    router.push('/broadcasts');
  }

  const contentName = channel === 'email' ? emailSubject : (template?.name ?? '');
  const contentMeta = channel === 'email' ? t('channelEmail') : (template?.language ?? 'en_US');

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {/* Channel toggle — only changeable before content is chosen */}
      {currentStep === 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setChannel('whatsapp')}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              channel === 'whatsapp'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card/50 text-muted-foreground hover:bg-card'
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {t('channelWhatsapp')}
          </button>
          <button
            type="button"
            onClick={() => setChannel('email')}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              channel === 'email'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card/50 text-muted-foreground hover:bg-card'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            {t('channelEmail')}
          </button>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                        ? 'border-2 border-primary bg-primary/10 text-primary'
                        : 'border border-border bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={`hidden text-sm font-medium sm:block ${
                    isActive ? 'text-foreground' : isCompleted ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {t(`steps.${step.label}`)}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-3 h-px flex-1 ${
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="relative min-h-[400px]">
        <div
          className="transition-all duration-300 ease-in-out"
          style={{
            opacity: isProcessing ? 0.6 : 1,
            pointerEvents: isProcessing ? 'none' : 'auto',
          }}
        >
          {currentStep === 0 && channel === 'whatsapp' && (
            <Step1ChooseTemplate
              selectedTemplate={template}
              onSelect={setTemplate}
              onNext={() => setCurrentStep(1)}
              onBack={() => router.push('/broadcasts')}
            />
          )}
          {currentStep === 0 && channel === 'email' && (
            <Step1EmailCompose
              subject={emailSubject}
              onSubjectChange={setEmailSubject}
              bodyText={emailBody}
              onBodyTextChange={setEmailBody}
              onNext={() => setCurrentStep(1)}
              onBack={() => router.push('/broadcasts')}
            />
          )}
          {currentStep === 1 && (
            <Step2SelectAudience
              audience={audience}
              onUpdate={setAudience}
              onNext={() => setCurrentStep(2)}
              onBack={() => setCurrentStep(0)}
            />
          )}
          {currentStep === 2 && channel === 'whatsapp' && template && (
            <Step3Personalize
              template={template}
              variables={variables}
              onUpdate={setVariables}
              headerMediaUrl={headerMediaUrl}
              onHeaderMediaUrlChange={setHeaderMediaUrl}
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
            />
          )}
          {currentStep === 2 && channel === 'email' && (
            <Step3EmailPersonalize
              subject={emailSubject}
              bodyText={emailBody}
              variables={emailVariables}
              onUpdate={setEmailVariables}
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
            />
          )}
          {currentStep === 3 && (
            <Step4ScheduleSend
              name={name}
              onNameChange={setName}
              contentName={contentName}
              contentMeta={contentMeta}
              audience={audience}
              onSend={handleSend}
              onSaveDraft={handleSaveDraft}
              onBack={() => setCurrentStep(2)}
              isProcessing={isProcessing}
              progress={progress}
            />
          )}
        </div>
      </div>
    </div>
  );
}
