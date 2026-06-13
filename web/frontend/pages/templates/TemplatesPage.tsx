import {
  Badge,
  BlockStack,
  Button,
  Card,
  Checkbox,
  Divider,
  InlineStack,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import { useEffect, useState } from 'react';
import {
  type MessageTemplate,
  useMessageTemplates,
  useUpdateMessageTemplate,
} from '../../hook/cod-dashboard';
import { ErrorBanner, dividerWrapStyle } from '../../components/dashboard/shared';

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
          },
        ]),
      ),
    );
  }, [data]);

  if (error) {
    return <ErrorBanner error={error} />;
  }

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Message templates
        </Text>
        {isLoading ? (
          <SkeletonBodyText lines={8} />
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
                <div key={template.id}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h3" variant="headingSm">
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
                  <div style={dividerWrapStyle}>
                    <Divider />
                  </div>
                </div>
              );
            })}
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}

type TemplateDraft = Pick<MessageTemplate, 'enabled' | 'body'> & {
  subject: string;
};

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

