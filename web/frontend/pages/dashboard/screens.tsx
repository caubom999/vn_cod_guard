import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  Checkbox,
  Divider,
  FormLayout,
  InlineStack,
  Select,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  BillingPlan,
  BillingPlanKey,
  useBillingSummary,
  useSelectFreePlan,
  useSubscribeBillingPlan,
  useSyncBilling,
} from '../../hook/billing';
import {
  BlacklistEntry,
  CodOrderDetail,
  CodOrderStatus,
  CodOrderSummary,
  MessageTemplate,
  RiskRule,
  useBlacklist,
  useCodOrderDetail,
  useCodOrders,
  useCodOverview,
  useCreateBlacklistEntry,
  useDeleteBlacklistEntry,
  useMessageTemplates,
  useRiskRules,
  useUpdateMessageTemplate,
} from '../../hook/cod-dashboard';
import {
  CodSettings,
  UpdateCodSettings,
  useCodSettings,
  useUpdateCodSettings,
} from '../../hook/cod-settings';

const channelOptions = [
  { label: 'Email', value: 'EMAIL' },
  { label: 'SMS', value: 'SMS' },
  { label: 'Zalo', value: 'ZALO' },
  { label: 'WhatsApp', value: 'WHATSAPP' },
  { label: 'Manual', value: 'MANUAL' },
];

const orderStatusOptions = [
  { label: 'All orders', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Cancelled', value: 'CANCELLED_BY_CUSTOMER' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Risky', value: 'RISKY' },
];

const blacklistTypeOptions = [
  { label: 'Phone', value: 'PHONE' },
  { label: 'Email', value: 'EMAIL' },
  { label: 'Address', value: 'ADDRESS' },
];

const emptyForm: UpdateCodSettings = {
  enabled: true,
  defaultChannel: 'EMAIL',
  confirmationDeadlineMinutes: 1440,
  reminderDelayMinutes: 180,
  maxReminders: 2,
  autoCancelUnconfirmed: false,
  pendingTag: 'cod_pending',
  confirmedTag: 'cod_confirmed',
  cancelledTag: 'cod_cancelled',
  expiredTag: 'cod_no_response',
  riskTag: 'cod_risky',
  codPaymentNames: [],
};

export function OverviewScreen() {
  const { data, isLoading, error } = useCodOverview();

  if (error) {
    return <ErrorBanner error={error} />;
  }

  return (
    <BlockStack gap="400">
      <MetricGrid>
        <MetricCard
          label="Pending"
          value={data?.counts.pending}
          tone="attention"
          loading={isLoading}
        />
        <MetricCard
          label="Confirmed"
          value={data?.counts.confirmed}
          tone="success"
          loading={isLoading}
        />
        <MetricCard
          label="Cancelled"
          value={data?.counts.cancelled}
          tone="critical"
          loading={isLoading}
        />
        <MetricCard
          label="Expired"
          value={data?.counts.expired}
          loading={isLoading}
        />
        <MetricCard
          label="Risky"
          value={data?.counts.risky}
          tone="warning"
          loading={isLoading}
        />
      </MetricGrid>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            Today focus
          </Text>
          {isLoading ? (
            <SkeletonBodyText lines={4} />
          ) : (
            <BlockStack gap="200">
              <Text as="p">
                <Text as="span" fontWeight="semibold">
                  Actionable orders:
                </Text>{' '}
                {formatNumber(data?.metrics.actionableOrders)} orders need
                confirmation, review, or reminder follow-up.
              </Text>
              <Text as="p">
                <Text as="span" fontWeight="semibold">
                  Confirmation rate:
                </Text>{' '}
                {formatPercent(data?.metrics.confirmationRate)}
              </Text>
              <Text as="p">
                <Text as="span" fontWeight="semibold">
                  No-response rate:
                </Text>{' '}
                {formatPercent(data?.metrics.noResponseRate)}
              </Text>
            </BlockStack>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

export function OrdersScreen() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const {
    data: orders,
    isLoading,
    error,
  } = useCodOrders(status, search.trim());
  const selectedOrder = useCodOrderDetail(selectedOrderId);

  useEffect(() => {
    setSelectedOrderId(null);
  }, [status, search]);

  if (error) {
    return <ErrorBanner error={error} />;
  }

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <InlineStack gap="300" blockAlign="end" wrap>
            <div style={filterFieldStyle}>
              <Select
                label="Status"
                options={orderStatusOptions}
                value={status}
                onChange={setStatus}
              />
            </div>
            <div style={searchFieldStyle}>
              <TextField
                label="Search order, customer, phone, email"
                value={search}
                onChange={setSearch}
                autoComplete="off"
              />
            </div>
          </InlineStack>

          {isLoading ? (
            <SkeletonBodyText lines={8} />
          ) : (
            <OrdersTable
              orders={orders || []}
              selectedOrderId={selectedOrderId}
              onSelect={setSelectedOrderId}
            />
          )}
        </BlockStack>
      </Card>

      {selectedOrderId ? (
        <OrderDetailCard
          order={selectedOrder.data}
          loading={selectedOrder.isLoading}
          error={selectedOrder.error}
        />
      ) : null}
    </BlockStack>
  );
}

export function BillingScreen() {
  const { data, isLoading, error } = useBillingSummary();
  const subscribe = useSubscribeBillingPlan();
  const selectFree = useSelectFreePlan();
  const syncBilling = useSyncBilling();

  const handleSelectPlan = (planKey: BillingPlanKey) => {
    if (planKey === 'FREE') {
      selectFree.mutate();
      return;
    }

    subscribe.mutate(planKey, {
      onSuccess: (result) => {
        window.open(result.confirmationUrl, '_top');
      },
    });
  };

  if (error) {
    return <ErrorBanner error={error} />;
  }

  const mutationError =
    subscribe.error || selectFree.error || syncBilling.error;

  return (
    <BlockStack gap="400">
      {mutationError ? <ErrorBanner error={mutationError} /> : null}

      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">
              Billing and usage
            </Text>
            {data?.billingTest ? (
              <Badge tone="attention">Test billing</Badge>
            ) : null}
          </InlineStack>

          {isLoading || !data ? (
            <SkeletonBodyText lines={6} />
          ) : (
            <BlockStack gap="400">
              <MetricGrid>
                <MetricCard
                  label="Current plan"
                  value={data.currentPlan.displayName}
                />
                <MetricCard label="Status" value={data.subscription.status} />
                <MetricCard
                  label="COD orders used"
                  value={data.usage.codOrdersUsed}
                  tone={
                    data.usage.limitReached
                      ? 'critical'
                      : data.usage.warning
                        ? 'warning'
                        : undefined
                  }
                />
                <MetricCard
                  label="Remaining"
                  value={data.usage.remainingCodOrders}
                />
              </MetricGrid>

              {data.usage.limitReached ? (
                <Banner tone="critical">
                  <Text as="p">
                    Monthly COD quota is reached. New COD orders will be stored
                    for review, but verification automation is paused until the
                    plan is upgraded or the next month starts.
                  </Text>
                </Banner>
              ) : data.usage.warning ? (
                <Banner tone="warning">
                  <Text as="p">
                    This shop is close to the monthly COD order quota.
                  </Text>
                </Banner>
              ) : null}

              <InlineStack gap="300">
                <Button
                  onClick={() => syncBilling.mutate()}
                  loading={syncBilling.isPending}
                >
                  Sync Shopify billing
                </Button>
              </InlineStack>
            </BlockStack>
          )}
        </BlockStack>
      </Card>

      {data ? (
        <div style={metricGridStyle}>
          {data.plans.map((plan) => (
            <BillingPlanCard
              key={plan.key}
              plan={plan}
              currentPlanKey={data.subscription.planKey}
              pending={subscribe.isPending || selectFree.isPending}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>
      ) : null}
    </BlockStack>
  );
}

function BillingPlanCard({
  plan,
  currentPlanKey,
  pending,
  onSelect,
}: {
  plan: BillingPlan;
  currentPlanKey: BillingPlanKey;
  pending: boolean;
  onSelect: (planKey: BillingPlanKey) => void;
}) {
  const isCurrent = plan.key === currentPlanKey;

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingMd">
            {plan.displayName}
          </Text>
          {isCurrent ? <Badge tone="success">Current</Badge> : null}
        </InlineStack>
        <Text as="p" variant="headingLg">
          {plan.priceUsd === 0 ? 'Free' : '$' + plan.priceUsd + '/month'}
        </Text>
        {plan.trialDays > 0 ? (
          <Text as="p" tone="subdued">
            {plan.trialDays + '-day free trial'}
          </Text>
        ) : null}
        <Text as="p">
          {formatNumber(plan.monthlyCodOrderLimit)} COD orders/month
        </Text>
        <BlockStack gap="100">
          {plan.features.map((feature) => (
            <Text key={feature} as="p" tone="subdued">
              {feature}
            </Text>
          ))}
        </BlockStack>
        <Button
          variant={isCurrent ? undefined : 'primary'}
          disabled={isCurrent || pending}
          loading={pending}
          onClick={() => onSelect(plan.key)}
        >
          {isCurrent
            ? 'Current plan'
            : plan.key === 'FREE'
              ? 'Use Free'
              : 'Upgrade'}
        </Button>
      </BlockStack>
    </Card>
  );
}

export function SettingsScreen() {
  const {
    data: settings,
    isLoading: isSettingsLoading,
    error: settingsError,
  } = useCodSettings();
  const updateSettings = useUpdateCodSettings();
  const [form, setForm] = useState<UpdateCodSettings>(emptyForm);
  const [paymentNamesText, setPaymentNamesText] = useState('');

  useEffect(() => {
    if (!settings) {
      return;
    }

    setForm(toForm(settings));
    setPaymentNamesText(settings.codPaymentNames.join('\n'));
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!settings) {
      return false;
    }

    return JSON.stringify(form) !== JSON.stringify(toForm(settings));
  }, [form, settings]);

  const validation = useMemo(() => validateSettingsForm(form), [form]);
  const error = settingsError || updateSettings.error;

  const setField = <K extends keyof UpdateCodSettings>(
    key: K,
    value: UpdateCodSettings[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setNumberField = (key: keyof UpdateCodSettings, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value === '' ? 0 : Number(value),
    }));
  };

  const handlePaymentNamesChange = (value: string) => {
    setPaymentNamesText(value);
    setField(
      'codPaymentNames',
      value
        .split('\n')
        .map((name) => name.trim())
        .filter(Boolean),
    );
  };

  const handleSave = () => {
    if (!validation.isValid) {
      return;
    }

    updateSettings.mutate(form);
  };

  return (
    <Card>
      <BlockStack gap="400">
        {error ? <ErrorBanner error={error} /> : null}

        {!validation.isValid ? (
          <Banner tone="warning">
            <Text as="p">{validation.summary}</Text>
          </Banner>
        ) : null}

        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            COD verification settings
          </Text>
          <Badge tone={form.enabled ? 'success' : 'critical'}>
            {form.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </InlineStack>

        {isSettingsLoading ? (
          <SkeletonBodyText lines={8} />
        ) : (
          <FormLayout>
            <Checkbox
              label="Enable Vietnam COD Guard"
              checked={form.enabled}
              onChange={(checked) => setField('enabled', checked)}
            />

            <Select
              label="Default verification channel"
              options={channelOptions}
              value={form.defaultChannel}
              onChange={(value) =>
                setField(
                  'defaultChannel',
                  value as UpdateCodSettings['defaultChannel'],
                )
              }
            />

            <FormLayout.Group>
              <TextField
                label="Confirmation deadline (minutes)"
                type="number"
                min={1}
                max={10080}
                value={String(form.confirmationDeadlineMinutes)}
                onChange={(value) =>
                  setNumberField('confirmationDeadlineMinutes', value)
                }
                autoComplete="off"
                error={validation.errors.confirmationDeadlineMinutes}
              />
              <TextField
                label="Reminder delay (minutes)"
                type="number"
                min={1}
                max={10080}
                value={String(form.reminderDelayMinutes)}
                onChange={(value) =>
                  setNumberField('reminderDelayMinutes', value)
                }
                autoComplete="off"
                error={validation.errors.reminderDelayMinutes}
              />
              <TextField
                label="Max reminders"
                type="number"
                min={0}
                max={10}
                value={String(form.maxReminders)}
                onChange={(value) => setNumberField('maxReminders', value)}
                autoComplete="off"
                error={validation.errors.maxReminders}
              />
            </FormLayout.Group>

            <Checkbox
              label="Auto cancel unconfirmed orders"
              checked={form.autoCancelUnconfirmed}
              onChange={(checked) => setField('autoCancelUnconfirmed', checked)}
            />

            <FormLayout.Group>
              <TextField
                label="Pending tag"
                value={form.pendingTag}
                onChange={(value) => setField('pendingTag', value)}
                autoComplete="off"
                error={validation.errors.pendingTag}
              />
              <TextField
                label="Risk tag"
                value={form.riskTag}
                onChange={(value) => setField('riskTag', value)}
                autoComplete="off"
                error={validation.errors.riskTag}
              />
            </FormLayout.Group>

            <FormLayout.Group>
              <TextField
                label="Confirmed tag"
                value={form.confirmedTag}
                onChange={(value) => setField('confirmedTag', value)}
                autoComplete="off"
                error={validation.errors.confirmedTag}
              />
              <TextField
                label="Cancelled tag"
                value={form.cancelledTag}
                onChange={(value) => setField('cancelledTag', value)}
                autoComplete="off"
                error={validation.errors.cancelledTag}
              />
              <TextField
                label="No response tag"
                value={form.expiredTag}
                onChange={(value) => setField('expiredTag', value)}
                autoComplete="off"
                error={validation.errors.expiredTag}
              />
            </FormLayout.Group>

            <TextField
              label="COD payment method names"
              value={paymentNamesText}
              onChange={handlePaymentNamesChange}
              multiline={5}
              autoComplete="off"
              helpText="One name per line, for example: Cash on Delivery (COD). Leave empty to use built-in defaults."
            />

            <InlineStack gap="300" blockAlign="center">
              <Button
                variant="primary"
                onClick={handleSave}
                loading={updateSettings.isPending}
                disabled={
                  !isDirty || !validation.isValid || updateSettings.isPending
                }
              >
                Save settings
              </Button>
              {updateSettings.isSuccess && !isDirty ? (
                <Badge tone="success">Saved</Badge>
              ) : null}
            </InlineStack>
          </FormLayout>
        )}
      </BlockStack>
    </Card>
  );
}

export function MessageTemplatesScreen() {
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

export function BlacklistScreen() {
  const { data, isLoading, error } = useBlacklist();
  const createEntry = useCreateBlacklistEntry();
  const deleteEntry = useDeleteBlacklistEntry();
  const [type, setType] = useState<BlacklistEntry['type']>('PHONE');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');

  const canAdd = value.trim().length > 0 && !createEntry.isPending;

  const handleAdd = () => {
    if (!canAdd) {
      return;
    }

    createEntry.mutate(
      { type, value: value.trim(), reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setValue('');
          setReason('');
        },
      },
    );
  };

  if (error) {
    return <ErrorBanner error={error} />;
  }

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Add blacklist entry
          </Text>
          <FormLayout>
            <FormLayout.Group>
              <Select
                label="Type"
                options={blacklistTypeOptions}
                value={type}
                onChange={(nextType) =>
                  setType(nextType as BlacklistEntry['type'])
                }
              />
              <TextField
                label="Value"
                value={value}
                onChange={setValue}
                autoComplete="off"
                placeholder="Phone, email, or address"
              />
            </FormLayout.Group>
            <TextField
              label="Reason"
              value={reason}
              onChange={setReason}
              autoComplete="off"
            />
            {createEntry.error ? (
              <ErrorBanner error={createEntry.error} />
            ) : null}
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={!canAdd}
              loading={createEntry.isPending}
            >
              Add entry
            </Button>
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Blacklist
          </Text>
          {isLoading ? (
            <SkeletonBodyText lines={8} />
          ) : (
            <BlacklistTable
              entries={data || []}
              deleting={deleteEntry.isPending}
              onDelete={(id) => deleteEntry.mutate(id)}
            />
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

export function AnalyticsScreen() {
  const { data, isLoading, error } = useCodOverview();
  const riskRules = useRiskRules();

  if (error) {
    return <ErrorBanner error={error} />;
  }

  return (
    <BlockStack gap="400">
      <MetricGrid>
        <MetricCard
          label="Confirmation rate"
          value={formatPercent(data?.metrics.confirmationRate)}
          loading={isLoading}
        />
        <MetricCard
          label="No-response rate"
          value={formatPercent(data?.metrics.noResponseRate)}
          loading={isLoading}
        />
        <MetricCard
          label="Cancelled by customer"
          value={data?.metrics.cancelledByCustomer}
          loading={isLoading}
        />
        <MetricCard
          label="Shipping cost saved"
          value={formatMoney(data?.metrics.estimatedShippingCostSaved, 'VND')}
          loading={isLoading}
        />
        <MetricCard
          label="Risk orders prevented"
          value={data?.metrics.riskOrdersPrevented}
          tone="warning"
          loading={isLoading}
        />
      </MetricGrid>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Active risk rules
          </Text>
          {riskRules.error ? <ErrorBanner error={riskRules.error} /> : null}
          {riskRules.isLoading ? (
            <SkeletonBodyText lines={6} />
          ) : (
            <RiskRulesTable rules={riskRules.data || []} />
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

function OrdersTable({
  orders,
  selectedOrderId,
  onSelect,
}: {
  orders: CodOrderSummary[];
  selectedOrderId: number | null;
  onSelect: (id: number) => void;
}) {
  if (orders.length === 0) {
    return <EmptyText text="No COD orders match this filter yet." />;
  }

  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Customer</Th>
            <Th>Amount</Th>
            <Th>Status</Th>
            <Th>Risk</Th>
            <Th>Expires</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              style={
                selectedOrderId === order.id ? selectedRowStyle : undefined
              }
            >
              <Td>{order.orderName || '#' + order.id}</Td>
              <Td>
                <BlockStack gap="100">
                  <Text as="span">{order.customerName || 'Unknown'}</Text>
                  <Text as="span" tone="subdued">
                    {order.customerPhone || order.customerEmail || 'No contact'}
                  </Text>
                </BlockStack>
              </Td>
              <Td>{formatMoney(order.totalAmount, order.currency || 'VND')}</Td>
              <Td>
                <StatusBadge status={order.status} />
              </Td>
              <Td>{order.riskScore}</Td>
              <Td>{formatDateTime(order.expiresAt)}</Td>
              <Td>
                <Button size="slim" onClick={() => onSelect(order.id)}>
                  View
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderDetailCard({
  order,
  loading,
  error,
}: {
  order?: CodOrderDetail;
  loading: boolean;
  error: unknown;
}) {
  if (error) {
    return <ErrorBanner error={error} />;
  }

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Order detail
        </Text>
        {loading || !order ? (
          <SkeletonBodyText lines={10} />
        ) : (
          <BlockStack gap="500">
            <MetricGrid>
              <MetricCard
                label="Order"
                value={order.orderName || '#' + order.id}
              />
              <MetricCard
                label="Amount"
                value={formatMoney(order.totalAmount, order.currency || 'VND')}
              />
              <MetricCard
                label="Risk score"
                value={order.riskScore}
                tone={order.riskScore >= 50 ? 'warning' : undefined}
              />
              <MetricCard label="Reminders" value={order.reminderCount} />
            </MetricGrid>

            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">
                Customer snapshot
              </Text>
              <Text as="p">{order.customerName || 'Unknown customer'}</Text>
              <Text as="p" tone="subdued">
                {order.customerPhone || 'No phone'} /{' '}
                {order.customerEmail || 'No email'}
              </Text>
              <Text as="p" tone="subdued">
                {compact([
                  order.shippingDistrict,
                  order.shippingCity,
                  order.shippingProvince,
                ]) || 'No shipping location'}
              </Text>
            </BlockStack>

            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Event timeline
              </Text>
              <Timeline
                items={[
                  ...order.events.map((event) => ({
                    id: 'event-' + event.id,
                    title: event.type,
                    detail: event.message || '',
                    time: event.createdAt,
                  })),
                  ...order.sessions.map((session) => ({
                    id: 'session-' + session.id,
                    title: 'Verification session ' + session.status,
                    detail:
                      session.channel +
                      ' expires ' +
                      formatDateTime(session.expiresAt),
                    time: session.createdAt,
                  })),
                  ...order.sessions.flatMap((session) =>
                    session.deliveries.map((delivery) => ({
                      id: 'delivery-' + delivery.id,
                      title: 'Message ' + delivery.status,
                      detail: compact([
                        delivery.recipient,
                        delivery.subject,
                        delivery.error,
                      ]),
                      time: delivery.sentAt || delivery.createdAt,
                    })),
                  ),
                  ...order.jobs.map((job) => ({
                    id: 'job-' + job.id,
                    title: 'Automation ' + job.type + ' / ' + job.status,
                    detail:
                      job.lastError || 'Run at ' + formatDateTime(job.runAt),
                    time: job.runAt,
                  })),
                ]}
              />
            </BlockStack>
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}

function BlacklistTable({
  entries,
  deleting,
  onDelete,
}: {
  entries: BlacklistEntry[];
  deleting: boolean;
  onDelete: (id: number) => void;
}) {
  if (entries.length === 0) {
    return <EmptyText text="No blacklist entries yet." />;
  }

  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Type</Th>
            <Th>Value</Th>
            <Th>Reason</Th>
            <Th>Hits</Th>
            <Th>Last seen</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <Td>{entry.type}</Td>
              <Td>{entry.value}</Td>
              <Td>{entry.reason || '-'}</Td>
              <Td>{entry.hitCount}</Td>
              <Td>{formatDateTime(entry.lastSeenAt)}</Td>
              <Td>
                <Button
                  tone="critical"
                  size="slim"
                  disabled={deleting}
                  onClick={() => onDelete(entry.id)}
                >
                  Delete
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RiskRulesTable({ rules }: { rules: RiskRule[] }) {
  if (rules.length === 0) {
    return <EmptyText text="No risk rules configured yet." />;
  }

  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Status</Th>
            <Th>Priority</Th>
            <Th>Condition</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id}>
              <Td>{rule.name}</Td>
              <Td>
                <Badge tone={rule.enabled ? 'success' : 'critical'}>
                  {rule.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </Td>
              <Td>{rule.priority}</Td>
              <Td>{formatJson(rule.conditionJson)}</Td>
              <Td>{formatJson(rule.actionJson)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Timeline({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    detail: string;
    time?: string | null;
  }>;
}) {
  const sorted = [...items].sort(
    (a, b) => Date.parse(b.time || '') - Date.parse(a.time || ''),
  );

  if (sorted.length === 0) {
    return <EmptyText text="No events have been recorded yet." />;
  }

  return (
    <BlockStack gap="300">
      {sorted.map((item) => (
        <div key={item.id} style={timelineItemStyle}>
          <InlineStack align="space-between" blockAlign="start" gap="300">
            <BlockStack gap="100">
              <Text as="p" fontWeight="semibold">
                {item.title}
              </Text>
              {item.detail ? (
                <Text as="p" tone="subdued">
                  {item.detail}
                </Text>
              ) : null}
            </BlockStack>
            <Text as="span" tone="subdued">
              {formatDateTime(item.time)}
            </Text>
          </InlineStack>
        </div>
      ))}
    </BlockStack>
  );
}

function MetricGrid({ children }: { children: ReactNode }) {
  return <div style={metricGridStyle}>{children}</div>;
}

function MetricCard({
  label,
  value,
  tone,
  loading = false,
}: {
  label: string;
  value?: string | number | null;
  tone?: 'success' | 'attention' | 'critical' | 'warning';
  loading?: boolean;
}) {
  return (
    <Card>
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="p" tone="subdued">
            {label}
          </Text>
          {tone ? <Badge tone={tone}>{toneLabel(tone)}</Badge> : null}
        </InlineStack>
        {loading ? (
          <SkeletonBodyText lines={1} />
        ) : (
          <Text as="p" variant="headingLg">
            {value ?? 0}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}

function StatusBadge({ status }: { status: CodOrderStatus }) {
  const map: Record<
    CodOrderStatus,
    { label: string; tone?: 'success' | 'attention' | 'critical' | 'warning' }
  > = {
    PENDING: { label: 'Pending', tone: 'attention' },
    CONFIRMED: { label: 'Confirmed', tone: 'success' },
    CANCELLED_BY_CUSTOMER: { label: 'Cancelled', tone: 'critical' },
    EXPIRED: { label: 'Expired' },
    NEEDS_REVIEW: { label: 'Risky', tone: 'warning' },
    SKIPPED: { label: 'Skipped' },
  };
  const item = map[status] || { label: status };

  return <Badge tone={item.tone}>{item.label}</Badge>;
}

export function ShopFact({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <BlockStack gap="100">
      <Text as="span" tone="subdued">
        {label}
      </Text>
      <Text as="span" fontWeight="semibold">
        {value || '-'}
      </Text>
    </BlockStack>
  );
}

export function ErrorBanner({ error }: { error: unknown }) {
  return (
    <Banner tone="critical">
      <Text as="p">{(error as Error).message}</Text>
    </Banner>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <Text as="p" tone="subdued">
      {text}
    </Text>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th style={thStyle}>{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td style={tdStyle}>{children}</td>;
}

function toForm(settings: CodSettings): UpdateCodSettings {
  return {
    enabled: settings.enabled,
    defaultChannel: settings.defaultChannel,
    confirmationDeadlineMinutes: settings.confirmationDeadlineMinutes,
    reminderDelayMinutes: settings.reminderDelayMinutes,
    maxReminders: settings.maxReminders,
    autoCancelUnconfirmed: settings.autoCancelUnconfirmed,
    pendingTag: settings.pendingTag,
    confirmedTag: settings.confirmedTag,
    cancelledTag: settings.cancelledTag,
    expiredTag: settings.expiredTag,
    riskTag: settings.riskTag,
    codPaymentNames: settings.codPaymentNames,
  };
}

type TemplateDraft = Pick<MessageTemplate, 'enabled' | 'body'> & {
  subject: string;
};

type SettingsValidation = {
  isValid: boolean;
  summary?: string;
  errors: Partial<Record<keyof UpdateCodSettings, string>>;
};

function validateSettingsForm(form: UpdateCodSettings): SettingsValidation {
  const errors: SettingsValidation['errors'] = {};

  validateIntegerRange(
    form.confirmationDeadlineMinutes,
    1,
    10080,
    'Confirmation deadline must be between 1 and 10080 minutes.',
    (message) => {
      errors.confirmationDeadlineMinutes = message;
    },
  );
  validateIntegerRange(
    form.reminderDelayMinutes,
    1,
    10080,
    'Reminder delay must be between 1 and 10080 minutes.',
    (message) => {
      errors.reminderDelayMinutes = message;
    },
  );
  validateIntegerRange(
    form.maxReminders,
    0,
    10,
    'Max reminders must be between 0 and 10.',
    (message) => {
      errors.maxReminders = message;
    },
  );

  if (
    !errors.confirmationDeadlineMinutes &&
    !errors.reminderDelayMinutes &&
    form.maxReminders > 0 &&
    form.reminderDelayMinutes >= form.confirmationDeadlineMinutes
  ) {
    errors.reminderDelayMinutes =
      'Reminder delay must be lower than the confirmation deadline when reminders are enabled.';
  }

  for (const key of [
    'pendingTag',
    'confirmedTag',
    'cancelledTag',
    'expiredTag',
    'riskTag',
  ] as const) {
    const value = form[key].trim();

    if (!value) {
      errors[key] = 'Tag is required.';
    } else if (value.length > 64) {
      errors[key] = 'Tag must be 64 characters or fewer.';
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    summary: isValid
      ? undefined
      : 'Please fix the highlighted settings before saving.',
    errors,
  };
}

function validateIntegerRange(
  value: number,
  min: number,
  max: number,
  message: string,
  setError: (message: string) => void,
) {
  if (!Number.isInteger(value) || value < min || value > max) {
    setError(message);
  }
}

function isTemplateDirty(template: MessageTemplate, draft: TemplateDraft) {
  return (
    (template.subject || '') !== draft.subject ||
    template.body !== draft.body ||
    template.enabled !== draft.enabled
  );
}

function formatPercent(value?: number | null) {
  if (value === undefined || value === null) {
    return '0%';
  }

  return value.toFixed(1) + '%';
}

function formatNumber(value?: number | null) {
  return Intl.NumberFormat('vi-VN').format(value || 0);
}

function formatMoney(value?: string | number | null, currency = 'VND') {
  const amount = Number(value || 0);

  return Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'VND' ? 0 : 2,
  }).format(amount);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return '-';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '-';
  }
}

function compact(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(', ');
}

function toneLabel(tone: 'success' | 'attention' | 'critical' | 'warning') {
  const labels = {
    success: 'Good',
    attention: 'Open',
    critical: 'Bad',
    warning: 'Risk',
  };

  return labels[tone];
}

const metricGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '16px',
};

const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
};

const filterFieldStyle: CSSProperties = {
  minWidth: 220,
};

const searchFieldStyle: CSSProperties = {
  minWidth: 320,
  flex: 1,
};

const dividerWrapStyle: CSSProperties = {
  paddingTop: 20,
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 760,
};

const thStyle: CSSProperties = {
  padding: '12px 10px',
  borderBottom: '1px solid #dfe3e8',
  textAlign: 'left',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  padding: '12px 10px',
  borderBottom: '1px solid #ebedf0',
  verticalAlign: 'top',
};

const selectedRowStyle: CSSProperties = {
  background: '#f1f8ff',
};

const timelineItemStyle: CSSProperties = {
  border: '1px solid #dfe3e8',
  borderRadius: 8,
  padding: 12,
};
