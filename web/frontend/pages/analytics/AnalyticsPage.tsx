import {
  Badge,
  BlockStack,
  Button,
  Card,
  Checkbox,
  EmptySearchResult,
  FormLayout,
  IndexTable,
  InlineStack,
  Modal,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import { useState } from 'react';
import {
  type BlacklistScoringSettings,
  type RiskRule,
  useBlacklistScoring,
  useCodOverview,
  useRiskRules,
  useUpdateBlacklistScoring,
  useUpdateRiskRule,
} from '../../hook/cod-dashboard';
import {
  ErrorBanner,
  MetricCard,
  MetricGrid,
  formatMoney,
  formatPercent,
} from '../../components/dashboard/shared';
import { getRiskBand } from '../../utils/risk-score';

function AnalyticsScreen() {
  const { data, isLoading, error } = useCodOverview();
  const riskRules = useRiskRules();
  const updateRiskRule = useUpdateRiskRule();
  const blacklistScoring = useBlacklistScoring();
  const updateBlacklistScoring = useUpdateBlacklistScoring();
  const [editingRule, setEditingRule] = useState<RiskRule | null>(null);
  const [editingBlacklistType, setEditingBlacklistType] =
    useState<BlacklistRuleType | null>(null);

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
            <InlineStack gap="200" wrap>
              {[0, 25, 50, 75].map((score) => {
                const band = getRiskBand(score);

                return (
                  <Badge key={band.label} tone={band.tone}>
                    {`${band.label}: ${band.range}`}
                  </Badge>
                );
              })}
            </InlineStack>
            <Text as="p" tone="subdued">
              Orders with 50 points or more are marked for review and tagged
              <code> cod_risky</code>. Risk scoring does not automatically
              block or cancel an order. The score is a review signal, not a
              probability of fraud.
            </Text>
          </BlockStack>

          {blacklistScoring.error ? (
            <ErrorBanner error={blacklistScoring.error} />
          ) : blacklistScoring.isLoading || !blacklistScoring.data ? (
            <SkeletonBodyText lines={4} />
          ) : (
            <BlacklistScoringTable
              settings={blacklistScoring.data}
              onEdit={setEditingBlacklistType}
            />
          )}
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

      {editingBlacklistType && blacklistScoring.data ? (
        <BlacklistRuleEditModal
          type={editingBlacklistType}
          settings={blacklistScoring.data}
          saving={updateBlacklistScoring.isPending}
          error={updateBlacklistScoring.error}
          onClose={() => {
            updateBlacklistScoring.reset();
            setEditingBlacklistType(null);
          }}
          onSave={(settings) => {
            updateBlacklistScoring.mutate(settings, {
              onSuccess: () => setEditingBlacklistType(null),
            });
          }}
        />
      ) : null}
    </BlockStack>
  );
}

type BlacklistRuleType = 'phone' | 'email' | 'address';

const blacklistScoringRules: Array<{
  type: BlacklistRuleType;
  name: string;
  condition: string;
}> = [
  {
    type: 'phone',
    name: 'Blacklisted phone number',
    condition: 'The order phone number exactly matches a blacklist entry.',
  },
  {
    type: 'email',
    name: 'Blacklisted email address',
    condition: 'The customer email exactly matches a blacklist entry.',
  },
  {
    type: 'address',
    name: 'Blacklisted shipping address',
    condition:
      'The normalized full shipping address matches a blacklist entry.',
  },
];

function BlacklistScoringTable({
  settings,
  onEdit,
}: {
  settings: BlacklistScoringSettings;
  onEdit: (type: BlacklistRuleType) => void;
}) {
  return (
    <BlockStack gap="300">
      <Text as="h3" variant="headingSm">
        Blacklist rules
      </Text>
      <IndexTable
        resourceName={{ singular: 'blacklist rule', plural: 'blacklist rules' }}
        itemCount={blacklistScoringRules.length}
        selectable={false}
        headings={[
          { title: 'Risk signal' },
          { title: 'Status' },
          { title: 'When it matches' },
          { title: 'Score added' },
          { title: 'Actions', alignment: 'end' },
        ]}
      >
        {blacklistScoringRules.map((rule, index) => (
          <IndexTable.Row id={rule.type} key={rule.type} position={index}>
            <IndexTable.Cell>
              <Text as="span" fontWeight="semibold">
                {rule.name}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
                  <Badge
                    tone={
                      getBlacklistRuleEnabled(settings, rule.type)
                        ? 'success'
                        : 'critical'
                    }
                  >
                    {getBlacklistRuleEnabled(settings, rule.type)
                      ? 'Enabled'
                      : 'Disabled'}
                  </Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>{rule.condition}</IndexTable.Cell>
            <IndexTable.Cell>
                  <Badge
                    tone={
                      getBlacklistRuleEnabled(settings, rule.type)
                        ? 'warning'
                        : undefined
                    }
                  >
                    {`+${getBlacklistRuleScore(settings, rule.type)} points`}
                  </Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <InlineStack align="end">
                  <Button size="slim" onClick={() => onEdit(rule.type)}>
                    Edit
                  </Button>
              </InlineStack>
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>
    </BlockStack>
  );
}

function BlacklistRuleEditModal({
  type,
  settings,
  saving,
  error,
  onClose,
  onSave,
}: {
  type: BlacklistRuleType;
  settings: BlacklistScoringSettings;
  saving: boolean;
  error: unknown;
  onClose: () => void;
  onSave: (settings: BlacklistScoringSettings) => void;
}) {
  const rule = blacklistScoringRules.find((item) => item.type === type);
  const [enabled, setEnabled] = useState(
    getBlacklistRuleEnabled(settings, type),
  );
  const [score, setScore] = useState(
    String(getBlacklistRuleScore(settings, type)),
  );
  const scoreNumber = Number(score);
  const scoreError =
    !Number.isInteger(scoreNumber) || scoreNumber < 1 || scoreNumber > 100
      ? 'Enter a score from 1 to 100.'
      : undefined;

  const handleSave = () => {
    if (scoreError) {
      return;
    }

    onSave(updateBlacklistRule(settings, type, enabled, scoreNumber));
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit blacklist rule: ${rule?.name || type}`}
      primaryAction={{
        content: 'Save rule',
        onAction: handleSave,
        loading: saving,
        disabled: Boolean(scoreError) || saving,
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
          <Text as="p" tone="subdued">
            {rule?.condition}
          </Text>
          <Checkbox
            label="Enable this blacklist rule"
            checked={enabled}
            onChange={setEnabled}
          />
          <TextField
            label="Risk score to add"
            helpText="Use 1–100 points, or disable the rule to contribute 0. The final score is capped at 100."
            value={score}
            onChange={setScore}
            type="number"
            min={1}
            max={100}
            suffix="points"
            autoComplete="off"
            error={scoreError}
          />
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

function getBlacklistRuleEnabled(
  settings: BlacklistScoringSettings,
  type: BlacklistRuleType,
) {
  if (type === 'phone') {
    return settings.blacklistPhoneEnabled;
  }

  if (type === 'email') {
    return settings.blacklistEmailEnabled;
  }

  return settings.blacklistAddressEnabled;
}

function getBlacklistRuleScore(
  settings: BlacklistScoringSettings,
  type: BlacklistRuleType,
) {
  if (type === 'phone') {
    return settings.blacklistPhoneScore;
  }

  if (type === 'email') {
    return settings.blacklistEmailScore;
  }

  return settings.blacklistAddressScore;
}

function updateBlacklistRule(
  settings: BlacklistScoringSettings,
  type: BlacklistRuleType,
  enabled: boolean,
  score: number,
): BlacklistScoringSettings {
  if (type === 'phone') {
    return {
      ...settings,
      blacklistPhoneEnabled: enabled,
      blacklistPhoneScore: score,
    };
  }

  if (type === 'email') {
    return {
      ...settings,
      blacklistEmailEnabled: enabled,
      blacklistEmailScore: score,
    };
  }

  return {
    ...settings,
    blacklistAddressEnabled: enabled,
    blacklistAddressScore: score,
  };
}

function RiskRulesTable({
  rules,
  onEdit,
}: {
  rules: RiskRule[];
  onEdit: (rule: RiskRule) => void;
}) {
  return (
    <IndexTable
      resourceName={{ singular: 'risk rule', plural: 'risk rules' }}
      itemCount={rules.length}
      selectable={false}
      hasZebraStriping
      lastColumnSticky
      headings={[
        { title: 'Rule' },
        { title: 'Status' },
        { title: 'When it matches' },
        { title: 'Score added' },
        { title: 'Actions', alignment: 'end' },
      ]}
      emptyState={
        <EmptySearchResult
          title="No risk rules configured"
          description="Risk rules will appear here when they are available."
          withIllustration
        />
      }
    >
      {rules.map((rule, index) => {
            const score = getRiskRuleScore(rule.actionJson);

            return (
          <IndexTable.Row
            id={String(rule.id)}
            key={rule.id}
            position={index}
          >
            <IndexTable.Cell>
              <Text as="span" fontWeight="semibold">
                {rule.name}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
                  <Badge tone={rule.enabled ? 'success' : 'critical'}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
              {formatRiskCondition(rule.conditionJson)}
            </IndexTable.Cell>
            <IndexTable.Cell>
                  {score === null ? (
                    '-'
                  ) : (
                    <Badge tone={rule.enabled ? 'warning' : undefined}>
                      {`+${score} points`}
                    </Badge>
                  )}
            </IndexTable.Cell>
            <IndexTable.Cell>
              <InlineStack align="end">
                  <Button size="slim" onClick={() => onEdit(rule)}>
                    Edit
                  </Button>
              </InlineStack>
            </IndexTable.Cell>
          </IndexTable.Row>
            );
          })}
    </IndexTable>
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
              helpText="Use 1–100 points, or disable the rule to contribute 0. The final score is capped at 100."
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
