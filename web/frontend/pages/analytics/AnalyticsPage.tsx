import { Badge, BlockStack, Card, SkeletonBodyText, Text } from '@shopify/polaris';
import { type RiskRule, useCodOverview, useRiskRules } from '../../hook/cod-dashboard';
import {
  EmptyText,
  ErrorBanner,
  MetricCard,
  MetricGrid,
  Td,
  Th,
  formatJson,
  formatMoney,
  formatPercent,
  tableStyle,
  tableWrapStyle,
} from '../../components/dashboard/shared';

function AnalyticsScreen() {
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

export default function AnalyticsPage() {
  return <AnalyticsScreen />;
}

