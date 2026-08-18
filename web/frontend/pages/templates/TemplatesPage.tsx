import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  Checkbox,
  Divider,
  InlineGrid,
  InlineStack,
  Select,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import { type ComponentType, useEffect, useState } from 'react';
import {
  type MessageTemplate,
  useMessageTemplates,
  useUpdateMessageTemplate,
} from '../../hook/cod-dashboard';
import { ErrorBanner } from '../../components/dashboard/shared';
import {
  Template1Preview,
  type TemplatePreviewDraft,
} from './templates/template-1';
import { Template2Preview } from './templates/template-2';
import { Template3Preview } from './templates/template-3';

const templateRegistry: Record<
  string,
  { label: string; Preview: ComponentType<{ draft: TemplatePreviewDraft }> }
> = {
  'template-1': { label: 'Template 1', Preview: Template1Preview },
  'template-2': { label: 'Template 2', Preview: Template2Preview },
  'template-3': { label: 'Template 3', Preview: Template3Preview },
};

const templateOptions = Object.entries(templateRegistry).map(
  ([value, template]) => ({
    label: template.label,
    value,
  }),
);

function MessageTemplatesScreen() {
  const { data, isLoading, error } = useMessageTemplates();
  const updateTemplate = useUpdateMessageTemplate();
  const [drafts, setDrafts] = useState<Record<number, TemplateDraft>>({});

  useEffect(() => {
    if (!data) {
      return;
    }

    setDrafts(
      Object.fromEntries(
        data.map((template) => [
          template.id,
          {
            subject: template.subject || '',
            body: template.body,
            enabled: template.enabled,
            templateKey: template.templateKey || 'template-1',
          },
        ]),
      ),
    );
  }, [data]);

  if (error) {
    return <ErrorBanner error={error} />;
  }

  return (
    <BlockStack gap="400">
      {isLoading ? (
        <Card>
          <SkeletonBodyText lines={10} />
        </Card>
      ) : (
        <BlockStack gap="500">
          {(data || []).map((template) => {
            const isSms = template.channel === 'SMS';
            const draft = drafts[template.id] || {
              subject: template.subject || '',
              body: template.body,
              enabled: template.enabled,
              templateKey: template.templateKey || 'template-1',
            };
            const dirty = isTemplateDirty(template, draft, isSms);
            const smsError = isSms ? smsTemplateError(draft.body) : null;

            return (
              <Card key={template.id}>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        {template.type} / {template.channel}
                      </Text>
                      <Badge tone={draft.enabled ? 'success' : 'critical'}>
                        {draft.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </InlineStack>
                    <Button
                      variant="primary"
                      disabled={
                        !dirty || Boolean(smsError) || updateTemplate.isPending
                      }
                      loading={updateTemplate.isPending}
                      onClick={() =>
                        updateTemplate.mutate(
                          isSms
                            ? {
                                id: template.id,
                                body: draft.body,
                                enabled: draft.enabled,
                              }
                            : { id: template.id, ...draft },
                        )
                      }
                    >
                      Save template
                    </Button>
                  </InlineStack>

                  <InlineGrid
                    columns={{ xs: 1, lg: ['oneThird', 'twoThirds'] }}
                    gap="600"
                    alignItems="start"
                  >
                    <BlockStack gap="300">
                      <Checkbox
                        label="Enable template"
                        checked={draft.enabled}
                        onChange={(checked) =>
                          setDrafts((current) => ({
                            ...current,
                            [template.id]: { ...draft, enabled: checked },
                          }))
                        }
                      />
                      {!isSms && (
                        <Select
                          label="Select template"
                          options={templateOptions}
                          value={draft.templateKey}
                          onChange={(value) =>
                            setDrafts((current) => ({
                              ...current,
                              [template.id]: { ...draft, templateKey: value },
                            }))
                          }
                        />
                      )}
                      <Divider />
                      {!isSms && (
                        <TextField
                          label="Subject"
                          value={draft.subject}
                          onChange={(value) =>
                            setDrafts((current) => ({
                              ...current,
                              [template.id]: { ...draft, subject: value },
                            }))
                          }
                          autoComplete="off"
                        />
                      )}
                      <TextField
                        label={isSms ? 'SMS text' : 'Body'}
                        value={draft.body}
                        onChange={(value) =>
                          setDrafts((current) => ({
                            ...current,
                            [template.id]: { ...draft, body: value },
                          }))
                        }
                        multiline={isSms ? 5 : 10}
                        maxLength={isSms ? 320 : undefined}
                        showCharacterCount={isSms}
                        helpText={
                          isSms
                            ? 'Allowed variables: {{shopName}}, {{customerName}}, {{orderName}}, {{amount}}, {{currency}}, {{expiresAt}}. COD Guard appends the verification URL.'
                            : undefined
                        }
                        autoComplete="off"
                      />
                      {smsError ? (
                        <Banner tone="critical">{smsError}</Banner>
                      ) : null}
                    </BlockStack>

                    <BlockStack gap="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h3" variant="headingSm">
                          {isSms ? 'SMS preview' : 'Email preview'}
                        </Text>
                        {isSms ? (
                          <Badge>
                            {`${smsPreview(draft.body).segments} segment(s)`}
                          </Badge>
                        ) : (
                          <Badge>
                            {templateRegistry[draft.templateKey]?.label}
                          </Badge>
                        )}
                      </InlineStack>
                      {isSms ? (
                        <SmsPreview body={draft.body} />
                      ) : (
                        <TemplatePreview draft={draft} />
                      )}
                    </BlockStack>
                  </InlineGrid>
                </BlockStack>
              </Card>
            );
          })}
        </BlockStack>
      )}
    </BlockStack>
  );
}

type TemplateDraft = Pick<MessageTemplate, 'enabled' | 'body'> & {
  subject: string;
  templateKey: string;
};

function TemplatePreview({ draft }: { draft: TemplateDraft }) {
  const template =
    templateRegistry[draft.templateKey] || templateRegistry['template-1'];
  const Preview = template.Preview;

  return <Preview draft={draft} />;
}

function SmsPreview({ body }: { body: string }) {
  const preview = smsPreview(body);

  return (
    <Card background="bg-surface-secondary">
      <BlockStack gap="300">
        <Text as="p" variant="bodySm" tone="subdued">
          COD Guard
        </Text>
        <Text as="p">{preview.text}</Text>
        <Text as="p" variant="bodySm" tone="subdued">
          {preview.characters} characters · {preview.encoding}
        </Text>
      </BlockStack>
    </Card>
  );
}

function smsPreview(body: string) {
  const text =
    body
      .replace(/{{\s*shopName\s*}}/g, 'Demo Store')
      .replace(/{{\s*customerName\s*}}/g, 'An')
      .replace(/{{\s*orderName\s*}}/g, '#1001')
      .replace(/{{\s*amount\s*}}/g, '450000')
      .replace(/{{\s*currency\s*}}/g, 'VND')
      .replace(/{{\s*expiresAt\s*}}/g, '20/07 18:00')
      .trim() + ' https://vtjr.online/api/verify/example';
  const unicode = /[^\x00-\x7F]/.test(text);
  const singleLimit = unicode ? 70 : 160;
  const joinedLimit = unicode ? 67 : 153;
  const segments =
    text.length <= singleLimit ? 1 : Math.ceil(text.length / joinedLimit);

  return {
    text,
    characters: text.length,
    segments,
    encoding: unicode ? 'Unicode' : 'GSM-compatible',
  };
}

function smsTemplateError(body: string) {
  if (!body.trim()) {
    return 'SMS template body is required.';
  }

  if (/\$\{[^}]+}/.test(body)) {
    return 'Use {{variable}} placeholders; ${data.variable} is not supported.';
  }

  if (/https?:\/\//i.test(body)) {
    return 'Remove URLs from the template. COD Guard appends the verification URL automatically.';
  }

  const allowed = new Set([
    'shopName',
    'customerName',
    'orderName',
    'amount',
    'currency',
    'expiresAt',
  ]);

  for (const match of body.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)) {
    if (!allowed.has(match[1])) {
      return `Unsupported SMS template variable: {{${match[1]}}}.`;
    }
  }

  const withoutVariables = body.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, '');
  if (withoutVariables.includes('{{') || withoutVariables.includes('}}')) {
    return 'SMS template contains a malformed {{variable}} placeholder.';
  }

  return null;
}

function isTemplateDirty(
  template: MessageTemplate,
  draft: TemplateDraft,
  isSms: boolean,
) {
  return (
    (!isSms && (template.subject || '') !== draft.subject) ||
    template.body !== draft.body ||
    template.enabled !== draft.enabled ||
    (!isSms && (template.templateKey || 'template-1') !== draft.templateKey)
  );
}

export default function TemplatesPage() {
  return <MessageTemplatesScreen />;
}
