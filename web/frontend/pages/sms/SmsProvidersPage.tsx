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

type ProviderId = 'twilio' | 'esms';

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
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [brandname, setBrandname] = useState('');
  const [sandbox, setSandbox] = useState(true);

  useEffect(() => {
    if (!integration.data) return;
    setProvider(integration.data.provider);
    setEnabled(integration.data.enabled);
    setFrom(integration.data.from);
    setBrandname(integration.data.brandname);
    setSandbox(integration.data.sandbox);
  }, [integration.data]);

  const dirty = useMemo(() => {
    const current = integration.data;
    if (!current) return false;
    return (
      provider !== current.provider ||
      enabled !== current.enabled ||
      from !== current.from ||
      brandname !== current.brandname ||
      sandbox !== current.sandbox ||
      Boolean(accountSid) ||
      Boolean(authToken) ||
      Boolean(apiKey) ||
      Boolean(secretKey)
    );
  }, [
    accountSid,
    apiKey,
    authToken,
    brandname,
    enabled,
    from,
    integration.data,
    provider,
    sandbox,
    secretKey,
  ]);

  const missingTwilioFields =
    provider === 'twilio' &&
    enabled &&
    (!from ||
      (!accountSid && !integration.data?.hasAccountSid) ||
      (!authToken && !integration.data?.hasAuthToken));
  const missingEsmsFields =
    provider === 'esms' &&
    enabled &&
    (!brandname ||
      (!apiKey && !integration.data?.hasApiKey) ||
      (!secretKey && !integration.data?.hasSecretKey));
  const missingProviderFields = missingTwilioFields || missingEsmsFields;
  const error =
    integration.error || update.error || test.error || disconnect.error;

  const save = async () => {
    await update.mutateAsync({
      provider,
      enabled,
      from,
      accountSid: accountSid || undefined,
      authToken: authToken || undefined,
      apiKey: apiKey || undefined,
      secretKey: secretKey || undefined,
      brandname,
      sandbox,
    });
    setAccountSid('');
    setAuthToken('');
    setApiKey('');
    setSecretKey('');
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
                onSelect={() => setProvider(option.id)}
              />
            ))}
          </InlineGrid>

          <Divider />

          {provider === 'twilio' ? (
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
                helpText="Sender IDs and international traffic might require registration with Twilio."
                onChange={setFrom}
                autoComplete="off"
              />
            </BlockStack>
          ) : (
            <BlockStack gap="400">
              <InlineStack gap="200" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  eSMS Vietnam connection
                </Text>
                <Badge tone="new">New</Badge>
              </InlineStack>
              <Banner tone="info">
                Use your eSMS API credentials and an approved Brandname. eSMS
                customer-care content must match a template registered with eSMS
                before live delivery.
              </Banner>
              <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                <TextField
                  label="API Key"
                  value={apiKey}
                  placeholder={
                    integration.data?.hasApiKey
                      ? 'Saved securely — enter to replace'
                      : 'Enter eSMS API Key'
                  }
                  onChange={setApiKey}
                  autoComplete="off"
                />
                <TextField
                  label="Secret Key"
                  type="password"
                  value={secretKey}
                  placeholder={
                    integration.data?.hasSecretKey
                      ? 'Saved securely — enter to replace'
                      : 'Enter eSMS Secret Key'
                  }
                  onChange={setSecretKey}
                  autoComplete="new-password"
                />
              </InlineGrid>
              <TextField
                label="Registered Brandname"
                value={brandname}
                placeholder="Your approved eSMS Brandname"
                helpText="Enter the Brandname exactly as approved in your eSMS account."
                onChange={setBrandname}
                autoComplete="off"
              />
              <Checkbox
                label="Use eSMS sandbox (no charge and no SMS delivery)"
                helpText="Sandbox lets eSMS validate send requests without charging the account or delivering a message. Turn this off only after Brandname and content approval."
                checked={sandbox}
                onChange={setSandbox}
              />
            </BlockStack>
          )}

          <Checkbox
            label="Enable SMS confirmations with this connection"
            checked={enabled}
            onChange={setEnabled}
          />

          {missingProviderFields ? (
            <Banner tone="warning">
              Complete all {provider === 'esms' ? 'eSMS' : 'Twilio'} fields
              before enabling the connection.
            </Banner>
          ) : null}

          {test.isSuccess ? (
            <Banner tone="success">
              Connection verified successfully.
              {test.data.balance !== undefined
                ? ` eSMS balance: ${test.data.balance}.`
                : ''}
            </Banner>
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
                disabled={!dirty || missingProviderFields || update.isPending}
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
          <Badge
            tone={
              unavailable || provider.badge === 'new'
                ? 'new'
                : selected
                  ? 'info'
                  : undefined
            }
          >
            {unavailable
              ? 'Coming soon'
              : selected
                ? 'Selected'
                : provider.badge === 'new'
                  ? 'New'
                  : 'Available'}
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
