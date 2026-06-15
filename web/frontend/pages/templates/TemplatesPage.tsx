import {
  Badge,
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

const templateRegistry: Record<
  string,
  { label: string; Preview: ComponentType<{ draft: TemplatePreviewDraft }> }
> = {
  'template-1': { label: 'Template 1', Preview: Template1Preview },
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
  const [selectedTemplates, setSelectedTemplates] = useState<
    Record<number, string>
  >({});

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
          },
        ]),
      ),
    );

    setSelectedTemplates((current) => ({
      ...Object.fromEntries(
        data.map((template) => [template.id, 'template-1']),
      ),
      ...current,
    }));
  }, [data]);

  if (error) {
    return <ErrorBanner error={error} />;
  }

  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
          <Text as="h1" variant="headingLg">
            Message templates
          </Text>
          <Text as="p" tone="subdued">
            Edit the message copy, choose a visual template, and preview the
            email customers will receive.
          </Text>
        </BlockStack>
      </InlineStack>

      {isLoading ? (
        <Card>
          <SkeletonBodyText lines={10} />
        </Card>
      ) : (
        <BlockStack gap="500">
          {(data || []).map((template) => {
            const draft = drafts[template.id] || {
              subject: template.subject || '',
              body: template.body,
              enabled: template.enabled,
            };
            const dirty = isTemplateDirty(template, draft);

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
                      disabled={!dirty || updateTemplate.isPending}
                      loading={updateTemplate.isPending}
                      onClick={() =>
                        updateTemplate.mutate({ id: template.id, ...draft })
                      }
                    >
                      Save template
                    </Button>
                  </InlineStack>

                  <InlineGrid columns={['oneThird', 'twoThirds']} gap="600">
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
                      <Select
                        label="Select template"
                        options={templateOptions}
                        value={selectedTemplates[template.id] || 'template-1'}
                        onChange={(value) =>
                          setSelectedTemplates((current) => ({
                            ...current,
                            [template.id]: value,
                          }))
                        }
                      />
                      <Divider />
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
                      <TextField
                        label="Body"
                        value={draft.body}
                        onChange={(value) =>
                          setDrafts((current) => ({
                            ...current,
                            [template.id]: { ...draft, body: value },
                          }))
                        }
                        multiline={10}
                        autoComplete="off"
                      />
                    </BlockStack>

                    <BlockStack gap="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h3" variant="headingSm">
                          Email preview
                        </Text>
                        <Badge>Template 1</Badge>
                      </InlineStack>
                      <TemplatePreview
                        draft={draft}
                        templateId={selectedTemplates[template.id]}
                      />
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
};

function TemplatePreview({
  draft,
  templateId = 'template-1',
}: {
  draft: TemplateDraft;
  templateId?: string;
}) {
  const template =
    templateRegistry[templateId] || templateRegistry['template-1'];
  const Preview = template.Preview;

  return <Preview draft={draft} />;
}

function isTemplateDirty(template: MessageTemplate, draft: TemplateDraft) {
  return (
    (template.subject || '') !== draft.subject ||
    template.body !== draft.body ||
    template.enabled !== draft.enabled
  );
}

export default function TemplatesPage() {
  return <MessageTemplatesScreen />;
}
