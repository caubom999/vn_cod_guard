import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  InlineStack,
  SkeletonBodyText,
  Text,
} from '@shopify/polaris';
import {
  type BillingPlan,
  type BillingPlanKey,
  useBillingSummary,
  useSelectFreePlan,
  useSubscribeBillingPlan,
  useSyncBilling,
} from '../../hook/billing';
import {
  ErrorBanner,
  MetricCard,
  MetricGrid,
  formatNumber,
  metricGridStyle,
} from '../../components/dashboard/shared';

function BillingScreen() {
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

export default function BillingPage() {
  return <BillingScreen />;
}

