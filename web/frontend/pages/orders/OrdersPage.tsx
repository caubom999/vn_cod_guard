import {
  BlockStack,
  Button,
  Card,
  DescriptionList,
  Divider,
  InlineStack,
  Modal,
  Select,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import { useEffect, useState } from 'react';
import {
  type CodOrderDetail,
  type CodOrderSummary,
  type RiskRule,
  useCodOrderDetail,
  useCodOrders,
  useRiskRules,
} from '../../hook/cod-dashboard';
import {
  EmptyText,
  ErrorBanner,
  MetricCard,
  MetricGrid,
  StatusBadge,
  Td,
  Th,
  compact,
  filterFieldStyle,
  formatDateTime,
  formatMoney,
  searchFieldStyle,
  selectedRowStyle,
  tableStyle,
  tableWrapStyle,
  timelineItemStyle,
} from '../../components/dashboard/shared';

const orderStatusOptions = [
  { label: 'All orders', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Cancelled', value: 'CANCELLED_BY_CUSTOMER' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Risky', value: 'RISKY' },
];

function OrdersScreen() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const {
    data: orders,
    isLoading,
    error,
  } = useCodOrders(status, search.trim());
  const selectedOrder = useCodOrderDetail(selectedOrderId);
  const riskRules = useRiskRules();

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

      <OrderDetailModal
        open={Boolean(selectedOrderId)}
        order={selectedOrder.data}
        loading={selectedOrder.isLoading}
        error={selectedOrder.error}
        riskRules={riskRules.data || []}
        onClose={() => setSelectedOrderId(null)}
      />
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
            <Th>Actions</Th>
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
                  View details
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderDetailModal({
  open,
  order,
  loading,
  error,
  riskRules,
  onClose,
}: {
  open: boolean;
  order?: CodOrderDetail;
  loading: boolean;
  error: unknown;
  riskRules: RiskRule[];
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={order?.orderName ? `Order ${order.orderName}` : 'Order details'}
      size="large"
      limitHeight
    >
      <Modal.Section>
        {error ? (
          <ErrorBanner error={error} />
        ) : loading || !order ? (
          <SkeletonBodyText lines={10} />
        ) : (
          <BlockStack gap="500">
            <InlineStack align="space-between" blockAlign="center">
              <StatusBadge status={order.status} />
              <Text as="p" tone="subdued">
                Received {formatDateTime(order.createdAt)}
              </Text>
            </InlineStack>

            <MetricGrid>
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

            <RiskBreakdown order={order} riskRules={riskRules} />

            <Divider />

            <DescriptionList
              gap="loose"
              items={[
                {
                  term: 'Customer',
                  description: order.customerName || 'Unknown customer',
                },
                {
                  term: 'Contact',
                  description: compact([
                    order.customerPhone,
                    order.customerEmail,
                  ]) || 'No contact information',
                },
                {
                  term: 'Shipping location',
                  description:
                    compact([
                      order.shippingDistrict,
                      order.shippingCity,
                      order.shippingProvince,
                    ]) || 'No shipping location',
                },
                {
                  term: 'Payment method',
                  description: order.paymentMethod || 'Not available',
                },
                {
                  term: 'Financial status',
                  description: formatLabel(order.financialStatus),
                },
                {
                  term: 'Fulfillment status',
                  description: formatLabel(order.fulfillmentStatus),
                },
                {
                  term: 'Confirmation deadline',
                  description: formatDateTime(order.expiresAt),
                },
                {
                  term: 'Decision time',
                  description: formatDateTime(
                    order.verifiedAt || order.cancelledAt,
                  ),
                },
              ]}
            />

            <LineItems value={order.lineItemsJson} currency={order.currency} />

            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Activity timeline
              </Text>
              <Timeline
                items={[
                  ...order.events.map((event) => ({
                    id: 'event-' + event.id,
                    title: formatEventTitle(event.type),
                    detail: event.message || '',
                    time: event.createdAt,
                  })),
                  ...order.sessions.map((session) => ({
                    id: 'session-' + session.id,
                    title:
                      'Verification session: ' +
                      formatLabel(session.status),
                    detail:
                      formatLabel(session.channel) +
                      ' · Expires ' +
                      formatDateTime(session.expiresAt),
                    time: session.createdAt,
                  })),
                  ...order.sessions.flatMap((session) =>
                    session.deliveries.map((delivery) => ({
                      id: 'delivery-' + delivery.id,
                      title: 'Message: ' + formatLabel(delivery.status),
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
                    title:
                      'Automation: ' +
                      formatLabel(job.type) +
                      ' · ' +
                      formatLabel(job.status),
                    detail:
                      job.lastError || 'Run at ' + formatDateTime(job.runAt),
                    time: job.runAt,
                  })),
                ]}
              />
            </BlockStack>
          </BlockStack>
        )}
      </Modal.Section>
    </Modal>
  );
}

function RiskBreakdown({
  order,
  riskRules,
}: {
  order: CodOrderDetail;
  riskRules: RiskRule[];
}) {
  const reasons = getRiskReasons(order.riskReasonJson);

  return (
    <BlockStack gap="200">
      <Text as="h3" variant="headingSm">
        Why this risk score?
      </Text>
      {reasons.length ? (
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {reasons.map((reason) => (
            <li key={reason}>
              <Text as="span">{formatRiskReason(reason, riskRules)}</Text>
            </li>
          ))}
        </ul>
      ) : (
        <Text as="p" tone="subdued">
          No risk signals were recorded for this order.
        </Text>
      )}
      {order.riskScore >= 50 ? (
        <Text as="p" tone="subdued">
          A score of 50 or more marks an order for review. Confirming the order
          removes the risky tag, but the original score remains here for audit.
        </Text>
      ) : null}
    </BlockStack>
  );
}

function LineItems({
  value,
  currency,
}: {
  value: unknown;
  currency?: string | null;
}) {
  const items = getLineItems(value);

  if (!items.length) {
    return null;
  }

  return (
    <BlockStack gap="300">
      <Text as="h3" variant="headingSm">
        Items
      </Text>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>SKU</Th>
              <Th>Quantity</Th>
              <Th>Price</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.sku || item.title}-${index}`}>
                <Td>{compact([item.title, item.variantTitle]) || '-'}</Td>
                <Td>{item.sku || '-'}</Td>
                <Td>{item.quantity}</Td>
                <Td>{formatMoney(item.price, currency || 'VND')}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BlockStack>
  );
}

type TimelineItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
};

function Timeline({ items }: { items: TimelineItem[] }) {
  const sortedItems = [...items].sort(
    (left, right) => Date.parse(right.time) - Date.parse(left.time),
  );

  if (!sortedItems.length) {
    return <EmptyText text="No activity has been recorded yet." />;
  }

  return (
    <BlockStack gap="200">
      {sortedItems.map((item) => (
        <div key={item.id} style={timelineItemStyle}>
          <BlockStack gap="100">
            <InlineStack align="space-between" gap="300" wrap={false}>
              <Text as="p" fontWeight="semibold">
                {item.title}
              </Text>
              <Text as="p" tone="subdued">
                {formatDateTime(item.time)}
              </Text>
            </InlineStack>
            {item.detail ? (
              <Text as="p" tone="subdued">
                {item.detail}
              </Text>
            ) : null}
          </BlockStack>
        </div>
      ))}
    </BlockStack>
  );
}

function getRiskReasons(value: unknown) {
  return Array.isArray(value)
    ? value.filter((reason): reason is string => typeof reason === 'string')
    : [];
}

function formatRiskReason(reason: string, riskRules: RiskRule[]) {
  const labels: Record<string, string> = {
    'blacklist:phone': 'Phone number matched the blacklist (+80)',
    'blacklist:email': 'Email address matched the blacklist (+70)',
    'blacklist:address': 'Shipping address matched the blacklist (+70)',
  };

  if (labels[reason]) {
    return labels[reason];
  }

  const scoredRule = reason.match(/^rule:(\d+):(.*)$/);

  if (scoredRule) {
    return `Risk rule matched: ${formatLabel(scoredRule[2])} (+${scoredRule[1]})`;
  }

  if (reason.startsWith('rule:')) {
    const ruleReason = reason.slice(5);
    const score = findRuleScore(ruleReason, riskRules);

    return (
      'Risk rule matched: ' +
      formatLabel(ruleReason) +
      (score === null ? '' : ` (+${score})`)
    );
  }

  return formatLabel(reason);
}

function findRuleScore(reason: string, rules: RiskRule[]) {
  for (const rule of rules) {
    const action =
      rule.actionJson && typeof rule.actionJson === 'object'
        ? (rule.actionJson as Record<string, unknown>)
        : null;

    if (
      action &&
      action.reason === reason &&
      typeof action.score === 'number'
    ) {
      return action.score;
    }
  }

  return null;
}

function formatEventTitle(type: string) {
  const labels: Record<string, string> = {
    ORDER_CAPTURED: 'COD order captured',
    ORDER_SKIPPED_NON_COD: 'Non-COD order skipped',
    VERIFICATION_LINK_READY: 'Verification link created',
    REMINDER_SENT: 'Reminder sent',
    VERIFICATION_CONFIRMED: 'Customer confirmed the order',
    VERIFICATION_CANCELLED: 'Customer cancelled the order',
    VERIFICATION_EXPIRED: 'Verification link expired',
    ORDER_EXPIRED_BY_WORKER: 'Order confirmation expired',
    ORDER_AUTO_CANCELLED: 'Order automatically cancelled',
    COD_FEE_APPLIED: 'COD fee applied',
    COD_FEE_SKIPPED: 'COD fee skipped',
    COD_FEE_FAILED: 'COD fee failed',
    BILLING_LIMIT_REACHED: 'Plan limit reached',
  };

  return labels[type] || formatLabel(type);
}

function formatLabel(value?: string | null) {
  if (!value) {
    return 'Not available';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getLineItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const source =
      item && typeof item === 'object'
        ? (item as Record<string, unknown>)
        : {};

    return {
      title: typeof source.title === 'string' ? source.title : '',
      variantTitle:
        typeof source.variantTitle === 'string' ? source.variantTitle : '',
      sku: typeof source.sku === 'string' ? source.sku : '',
      quantity:
        typeof source.quantity === 'number' ? source.quantity : 1,
      price:
        typeof source.price === 'string' ||
        typeof source.price === 'number'
          ? source.price
          : null,
    };
  });
}

export default function OrdersPage() {
  return <OrdersScreen />;
}
