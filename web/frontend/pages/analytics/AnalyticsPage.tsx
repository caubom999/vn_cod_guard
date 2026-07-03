import {
  Badge,
  BlockStack,
  Button,
  Card,
  Checkbox,
  FormLayout,
  InlineStack,
  Modal,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import { useState } from 'react';
import {
  type RiskRule,
  useCodOverview,
  useRiskRules,
  useUpdateRiskRule,
} from '../../hook/cod-dashboard';
import {
  EmptyText,
  ErrorBanner,
  MetricCard,
  MetricGrid,
  Td,
  Th,
  formatMoney,
  formatPercent,
  tableStyle,
  tableWrapStyle,
} from '../../components/dashboard/shared';

function AnalyticsScreen() {
  const { data, isLoading, error } = useCodOverview();
  const riskRules = useRiskRules();
  const updateRiskRule = useUpdateRiskRule();
  const [editingRule, setEditingRule] = useState<RiskRule | null>(null);

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
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              How risk scoring works
            </Text>
            <Text as="p" tone="subdued">
              Every COD order starts at 0. Points from every matching blacklist
              entry and enabled risk rule are added together, up to a maximum
              score of 100.
            </Text>
            <InlineStack gap="200" wrap>
              <Badge tone="warning">Review threshold: 50 points</Badge>
              <Badge>Maximum score: 100 points</Badge>
              <Badge>Scores are cumulative</Badge>
            </InlineStack>
            <Text as="p" tone="subdued">
              Orders with 50 points or more are marked for review and tagged
              <code> cod_risky</code>. Risk scoring does not automatically
              block or cancel an order.
            </Text>
          </BlockStack>

          <BlacklistScoringTable />
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              Configured risk rules
            </Text>
            <Text as="p" tone="subdued">
              Only enabled rules add points. You can adjust each rule to match
              your store's order values and risk tolerance.
            </Text>
          </BlockStack>
          {riskRules.error ? <ErrorBanner error={riskRules.error} /> : null}
          {riskRules.isLoading ? (
            <SkeletonBodyText lines={6} />
          ) : (
            <RiskRulesTable
              rules={riskRules.data || []}
              onEdit={setEditingRule}
            />
          )}
        </BlockStack>
      </Card>

      {editingRule ? (
        <RiskRuleEditModal
          rule={editingRule}
          saving={updateRiskRule.isPending}
          error={updateRiskRule.error}
          onClose={() => {
            updateRiskRule.reset();
            setEditingRule(null);
          }}
          onSave={(updates) => {
            updateRiskRule.mutate(
              { id: editingRule.id, ...updates },
              { onSuccess: () => setEditingRule(null) },
            );
          }}
        />
      ) : null}
    </BlockStack>
  );
}

const blacklistScoringRules = [
  {
    name: 'Blacklisted phone number',
    condition: 'The order phone number exactly matches a blacklist entry.',
    score: 80,
  },
  {
    name: 'Blacklisted email address',
    condition: 'The customer email exactly matches a blacklist entry.',
    score: 70,
  },
  {
    name: 'Blacklisted shipping address',
    condition:
      'The normalized full shipping address matches a blacklist entry.',
    score: 70,
  },
];

function BlacklistScoringTable() {
  return (
    <BlockStack gap="300">
      <Text as="h3" variant="headingSm">
        Blacklist rules
      </Text>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <Th>Risk signal</Th>
              <Th>When it matches</Th>
              <Th>Score added</Th>
            </tr>
          </thead>
          <tbody>
            {blacklistScoringRules.map((rule) => (
              <tr key={rule.name}>
                <Td>{rule.name}</Td>
                <Td>{rule.condition}</Td>
                <Td>
                  <Badge tone="warning">{`+${rule.score} points`}</Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BlockStack>
  );
}

function RiskRulesTable({
  rules,
  onEdit,
}: {
  rules: RiskRule[];
  onEdit: (rule: RiskRule) => void;
}) {
  if (rules.length === 0) {
    return <EmptyText text="No risk rules configured yet." />;
  }

  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Rule</Th>
            <Th>Status</Th>
            <Th>When it matches</Th>
            <Th>Score added</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => {
            const score = getRiskRuleScore(rule.actionJson);

            return (
              <tr key={rule.id}>
                <Td>{rule.name}</Td>
                <Td>
                  <Badge tone={rule.enabled ? 'success' : 'critical'}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </Td>
                <Td>{formatRiskCondition(rule.conditionJson)}</Td>
                <Td>
                  {score === null ? (
                    '-'
                  ) : (
                    <Badge tone={rule.enabled ? 'warning' : undefined}>
                      {`+${score} points`}
                    </Badge>
                  )}
                </Td>
                <Td>
                  <Button size="slim" onClick={() => onEdit(rule)}>
                    Edit
                  </Button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RiskRuleEditModal({
  rule,
  saving,
  error,
  onClose,
  onSave,
}: {
  rule: RiskRule;
  saving: boolean;
  error: unknown;
  onClose: () => void;
  onSave: (updates: {
    enabled: boolean;
    conditionJson: unknown;
    actionJson: unknown;
  }) => void;
}) {
  const condition = asRecord(rule.conditionJson) || {};
  const action = asRecord(rule.actionJson) || {};
  const [enabled, setEnabled] = useState(rule.enabled);
  const [score, setScore] = useState(
    typeof action.score === 'number' ? String(action.score) : '',
  );
  const [amount, setAmount] = useState(
    typeof condition.amount === 'number' ? String(condition.amount) : '',
  );
  const [cancelCount, setCancelCount] = useState(
    typeof condition.count === 'number' ? String(condition.count) : '',
  );
  const [provinces, setProvinces] = useState(
    getStringList(condition.provinces || condition.values).join(', '),
  );
  const [cities, setCities] = useState(
    getStringList(condition.cities || condition.values).join(', '),
  );
  const scoreNumber = Number(score);
  const amountNumber = Number(amount);
  const cancelCountNumber = Number(cancelCount);
  const scoreError =
    !Number.isInteger(scoreNumber) || scoreNumber < 1 || scoreNumber > 100
      ? 'Enter a score from 1 to 100.'
      : undefined;
  const amountError =
    condition.type === 'amount_gte' &&
    (amount === '' || !Number.isFinite(amountNumber) || amountNumber <= 0)
      ? 'Enter an order amount greater than 0.'
      : undefined;
  const cancelCountError =
    condition.type === 'phone_cancel_count_gte' &&
    (!Number.isInteger(cancelCountNumber) ||
      cancelCountNumber < 1 ||
      cancelCountNumber > 1000)
      ? 'Enter a cancellation count from 1 to 1,000.'
      : undefined;
  const isValid = !scoreError && !amountError && !cancelCountError;

  const handleSave = () => {
    if (!isValid) {
      return;
    }

    onSave({
      enabled,
      conditionJson: buildRiskCondition(condition, {
        amount: amountNumber,
        cancelCount: cancelCountNumber,
        provinces,
        cities,
      }),
      actionJson: {
        ...action,
        score: scoreNumber,
      },
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit risk rule: ${rule.name}`}
      primaryAction={{
        content: 'Save rule',
        onAction: handleSave,
        loading: saving,
        disabled: !isValid || saving,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
          disabled: saving,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Checkbox
            label="Enable this risk rule"
            checked={enabled}
            onChange={setEnabled}
          />

          <FormLayout>
            {condition.type === 'amount_gte' ? (
              <TextField
                label="Order amount threshold"
                helpText="Orders at or above this amount will match the rule."
                value={amount}
                onChange={setAmount}
                type="number"
                min={1}
                suffix="VND"
                autoComplete="off"
                error={amountError}
              />
            ) : null}

            {condition.type === 'phone_cancel_count_gte' ? (
              <TextField
                label="Previous cancelled COD orders"
                helpText="Match when the same phone number reaches this count."
                value={cancelCount}
                onChange={setCancelCount}
                type="number"
                min={1}
                max={1000}
                autoComplete="off"
                error={cancelCountError}
              />
            ) : null}

            {condition.type === 'province_in' ? (
              <TextField
                label="Shipping provinces"
                helpText="Separate multiple provinces with commas."
                value={provinces}
                onChange={setProvinces}
                autoComplete="off"
              />
            ) : null}

            {condition.type === 'city_in' ? (
              <TextField
                label="Shipping cities"
                helpText="Separate multiple cities with commas."
                value={cities}
                onChange={setCities}
                autoComplete="off"
              />
            ) : null}

            {condition.type === 'location_in' ? (
              <>
                <TextField
                  label="Shipping provinces"
                  helpText="Separate multiple provinces with commas."
                  value={provinces}
                  onChange={setProvinces}
                  autoComplete="off"
                />
                <TextField
                  label="Shipping cities"
                  helpText="Separate multiple cities with commas."
                  value={cities}
                  onChange={setCities}
                  autoComplete="off"
                />
              </>
            ) : null}

            <TextField
              label="Risk score to add"
              helpText="The final order score is capped at 100."
              value={score}
              onChange={setScore}
              type="number"
              min={1}
              max={100}
              suffix="points"
              autoComplete="off"
              error={scoreError}
            />
          </FormLayout>

          {error ? <ErrorBanner error={error} /> : null}

          <Text as="p" tone="subdued">
            Changes apply to new orders only. Existing order risk scores are
            preserved for audit history.
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

function buildRiskCondition(
  condition: Record<string, unknown>,
  values: {
    amount: number;
    cancelCount: number;
    provinces: string;
    cities: string;
  },
) {
  if (condition.type === 'amount_gte') {
    return { ...condition, amount: values.amount };
  }

  if (condition.type === 'phone_cancel_count_gte') {
    return { ...condition, count: values.cancelCount };
  }

  if (condition.type === 'province_in') {
    return { ...condition, values: splitList(values.provinces) };
  }

  if (condition.type === 'city_in') {
    return { ...condition, values: splitList(values.cities) };
  }

  if (condition.type === 'location_in') {
    return {
      ...condition,
      provinces: splitList(values.provinces),
      cities: splitList(values.cities),
    };
  }

  return condition;
}

function splitList(value: string) {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function formatRiskCondition(value: unknown) {
  const condition = asRecord(value);

  if (!condition) {
    return 'Condition is not configured.';
  }

  if (condition.type === 'missing_phone') {
    return 'The customer did not provide a phone number.';
  }

  if (condition.type === 'missing_email') {
    return 'The customer did not provide an email address.';
  }

  if (
    condition.type === 'amount_gte' &&
    typeof condition.amount === 'number'
  ) {
    return `The order total is at least ${formatMoney(condition.amount, 'VND')}.`;
  }

  if (condition.type === 'phone_cancel_count_gte') {
    const count =
      typeof condition.count === 'number' ? condition.count : undefined;

    return count
      ? `The phone number has at least ${count} previously cancelled COD orders.`
      : 'The phone number has multiple previously cancelled COD orders.';
  }

  if (condition.type === 'province_in') {
    return formatLocationCondition(
      'The shipping province is one of',
      condition.values,
    );
  }

  if (condition.type === 'city_in') {
    return formatLocationCondition(
      'The shipping city is one of',
      condition.values,
    );
  }

  if (condition.type === 'location_in') {
    const provinces = getStringList(condition.provinces);
    const cities = getStringList(condition.cities);
    const parts = [
      provinces.length ? `provinces: ${provinces.join(', ')}` : '',
      cities.length ? `cities: ${cities.join(', ')}` : '',
    ].filter(Boolean);

    return parts.length
      ? `The shipping location matches ${parts.join('; ')}.`
      : 'No provinces or cities have been configured yet.';
  }

  return 'A custom risk condition matches this order.';
}

function formatLocationCondition(prefix: string, value: unknown) {
  const locations = getStringList(value);

  return locations.length
    ? `${prefix}: ${locations.join(', ')}.`
    : 'No locations have been configured yet.';
}

function getRiskRuleScore(value: unknown) {
  const action = asRecord(value);

  return action && typeof action.score === 'number' ? action.score : null;
}

function getStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export default function AnalyticsPage() {
  return <AnalyticsScreen />;
}
