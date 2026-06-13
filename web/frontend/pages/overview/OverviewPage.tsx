import { BlockStack, Card, SkeletonBodyText, Text } from '@shopify/polaris';
import { useCodOverview } from '../../hook/cod-dashboard';
import {
  ErrorBanner,
  MetricCard,
  MetricGrid,
  formatNumber,
  formatPercent,
} from '../../components/dashboard/shared';

function OverviewScreen() {
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

export default function OverviewPage() {
  return <OverviewScreen />;
}

