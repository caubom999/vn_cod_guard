import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  InlineGrid,
  InlineStack,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import { useEffect, useMemo, useState } from 'react';
import { ErrorBanner } from '../../components/dashboard/shared';
import {
  type SmsProviderOption,
  useDisconnectSmsIntegration,
  useSmsIntegration,
  useTestSmsIntegration,
  useUpdateSmsIntegration,
} from '../../hook/sms-integration';

type ProviderId = 'twilio';

export default function SmsProvidersPage() {
  const integration = useSmsIntegration();
  const update = useUpdateSmsIntegration();
  const test = useTestSmsIntegration();
  const disconnect = useDisconnectSmsIntegration();
  const [provider, setProvider] = useState<ProviderId>('twilio');
  const [enabled, setEnabled] = useState(false);
  const [from, setFrom] = useState('');
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');

  useEffect(() => {
    if (!integration.data) return;
    setProvider(integration.data.provider);
    setEnabled(integration.data.enabled);
    setFrom(integration.data.from);
  }, [integration.data]);

  const dirty = useMemo(() => {
    const current = integration.data;
    if (!current) return false;
    return (
      provider !== current.provider ||
      enabled !== current.enabled ||
      from !== current.from ||
      Boolean(accountSid) ||
      Boolean(authToken)
    );
  }, [accountSid, authToken, enabled, from, integration.data, provider]);

  const missingTwilioFields =
    provider === 'twilio' &&
    enabled &&
    (!from ||
      (!accountSid && !integration.data?.hasAccountSid) ||
      (!authToken && !integration.data?.hasAuthToken));
  const error =
    integration.error || update.error || test.error || disconnect.error;

  const save = async () => {
    await update.mutateAsync({
      provider,
      enabled,
      from,
      accountSid: accountSid || undefined,
      authToken: authToken || undefined,
    });
    setAccountSid('');
    setAuthToken('');
  };

  if (integration.isLoading) {
    return (
      <Card>
        <SkeletonBodyText lines={10} />
      </Card>
    );
  }

  return (
    <BlockStack gap="500">
      {error ? <ErrorBanner error={error} /> : null}

      <Box background="bg-fill-info-secondary" borderRadius="400" padding="600">
        <InlineGrid columns={{ xs: 1, md: '2fr 1fr' }} gap="500">
          <BlockStack gap="300">
            <InlineStack gap="200" blockAlign="center">
              <Badge tone="info">Direct billing</Badge>
              <Text as="span" tone="subdued">
                No SMS markup
              </Text>
            </InlineStack>
            <Text as="h2" variant="headingLg">
              Your SMS account. Your rates. Your control.
            </Text>
            <Text as="p" variant="bodyLg">
              Connect a provider you trust. Message costs go directly to that
              provider, while COD Guard manages order verification and delivery
              tracking.
            </Text>
          </BlockStack>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">
                Connection status
              </Text>
              <InlineStack gap="200" blockAlign="center">
                <Badge
                  tone={integration.data?.enabled ? 'success' : 'attention'}
                >
                  {integration.data?.enabled
                    ? 'Ready to send'
                    : 'Action needed'}
                </Badge>
              </InlineStack>
              <Text as="p" tone="subdued">
                {integration.data?.enabled
                  ? 'COD confirmations can use this SMS connection.'
                  : 'Choose a provider and save valid credentials.'}
              </Text>
            </BlockStack>
          </Card>
        </InlineGrid>
      </Box>

      <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
        <ValueCard
          number="01"
          title="Connect"
          text="Use your own provider account and negotiated rates."
        />
        <ValueCard
          number="02"
          title="Protect"
          text="Credentials are encrypted before they are stored."
        />
        <ValueCard
          number="03"
          title="Send"
          text="Only accepted messages count in provider usage."
        />
      </InlineGrid>

      <Card>
        <BlockStack gap="500">
          <BlockStack gap="150">
            <Text as="h2" variant="headingMd">
              Choose a messaging provider
            </Text>
            <Text as="p" tone="subdued">
              Provider availability depends on sender registration and the
              destination country.
            </Text>
          </BlockStack>

          <InlineGrid columns={{ xs: 1, md: 3 }} gap="300">
            {integration.data?.providers.map((option) => (
              <ProviderCard
                key={option.id}
                provider={option}
                selected={provider === option.id}
                onSelect={() => {
                  if (option.id !== 'esms') setProvider(option.id);
                }}
              />
            ))}
          </InlineGrid>

          <Divider />

          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Twilio connection
            </Text>
            <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
              <TextField
                label="Account SID"
                value={accountSid}
                placeholder={
                  integration.data?.hasAccountSid
                    ? 'Saved securely — enter to replace'
                    : 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                }
                onChange={setAccountSid}
                autoComplete="off"
              />
              <TextField
                label="Auth Token"
                type="password"
                value={authToken}
                placeholder={
                  integration.data?.hasAuthToken
                    ? 'Saved securely — enter to replace'
                    : 'Enter Twilio auth token'
                }
                onChange={setAuthToken}
                autoComplete="new-password"
              />
            </InlineGrid>
            <TextField
              label="Sender number or approved Sender ID"
              value={from}
              placeholder="+12025550123"
              helpText="For Vietnam, sender IDs and traffic might require registration with your provider."
              onChange={setFrom}
              autoComplete="off"
            />
          </BlockStack>

          <Checkbox
            label="Enable SMS confirmations with this connection"
            checked={enabled}
            onChange={setEnabled}
          />

          {missingTwilioFields ? (
            <Banner tone="warning">
              Complete all Twilio fields before enabling the connection.
            </Banner>
          ) : null}

          {test.isSuccess ? (
            <Banner tone="success">Connection verified successfully.</Banner>
          ) : null}

          <InlineStack align="space-between" blockAlign="center" gap="300">
            <Button
              tone="critical"
              variant="plain"
              disabled={!integration.data?.configured || disconnect.isPending}
              loading={disconnect.isPending}
              onClick={() => void disconnect.mutateAsync()}
            >
              Disconnect
            </Button>
            <InlineStack gap="300">
              <Button
                disabled={!integration.data?.enabled || dirty || test.isPending}
                loading={test.isPending}
                onClick={() => void test.mutateAsync()}
              >
                Test connection
              </Button>
              <Button
                variant="primary"
                disabled={!dirty || missingTwilioFields || update.isPending}
                loading={update.isPending}
                onClick={() => void save()}
              >
                Save connection
              </Button>
            </InlineStack>
          </InlineStack>
        </BlockStack>
      </Card>

      <Banner tone="info">
        COD Guard never displays saved tokens again. Disconnecting removes the
        encrypted credentials and immediately disables SMS delivery.
      </Banner>
    </BlockStack>
  );
}

function ValueCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="span" variant="headingSm" tone="subdued">
          {number}
        </Text>
        <Text as="h3" variant="headingMd">
          {title}
        </Text>
        <Text as="p" tone="subdued">
          {text}
        </Text>
      </BlockStack>
    </Card>
  );
}

function ProviderCard({
  provider,
  selected,
  onSelect,
}: {
  provider: SmsProviderOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const unavailable = provider.availability === 'coming-soon';
  return (
    <Box
      borderColor={selected ? 'border-info' : 'border'}
      borderWidth="025"
      borderRadius="300"
      padding="400"
      background={selected ? 'bg-surface-info' : 'bg-surface'}
    >
      <BlockStack gap="250">
        <InlineStack align="space-between" blockAlign="center" gap="200">
          <Text as="h3" variant="headingMd">
            {provider.name}
          </Text>
          <Badge tone={unavailable ? 'new' : selected ? 'info' : undefined}>
            {unavailable ? 'Coming soon' : selected ? 'Selected' : 'Available'}
          </Badge>
        </InlineStack>
        <Text as="p" tone="subdued">
          {provider.description}
        </Text>
        <Button disabled={unavailable} pressed={selected} onClick={onSelect}>
          {selected ? 'Selected' : 'Choose provider'}
        </Button>
      </BlockStack>
    </Box>
  );
}
