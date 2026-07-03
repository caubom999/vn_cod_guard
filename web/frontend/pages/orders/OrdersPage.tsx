import {
  BlockStack,
  Box,
  Button,
  Card,
  DescriptionList,
  Divider,
  EmptySearchResult,
  IndexTable,
  InlineGrid,
  InlineStack,
  List,
  Modal,
  Pagination,
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
  compact,
  formatDateTime,
  formatMoney,
} from '../../components/dashboard/shared';

const orderStatusOptions = [
  { label: 'All orders', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Cancelled', value: 'CANCELLED_BY_CUSTOMER' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Risky', value: 'RISKY' },
];

const pageSizeOptions = [
  { label: '10', value: '10' },
  { label: '20', value: '20' },
  { label: '50', value: '50' },
  { label: '100', value: '100' },
];

function OrdersScreen() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const {
    data: ordersResult,
    isLoading,
    error,
  } = useCodOrders(status, search.trim(), page, pageSize);
  const selectedOrder = useCodOrderDetail(selectedOrderId);
  const riskRules = useRiskRules();

  useEffect(() => {
    setPage(1);
    setSelectedOrderId(null);
  }, [status, search, pageSize]);

  useEffect(() => {
    setSelectedOrderId(null);
  }, [page]);

  if (error) {
    return <ErrorBanner error={error} />;
  }

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <InlineGrid columns={{ xs: 1, md: 3 }} gap="300" alignItems="end">
              <Select
                label="Status"
                options={orderStatusOptions}
                value={status}
                onChange={setStatus}
              />
              <TextField
                label="Search order, customer, phone, email"
                value={search}
                onChange={setSearch}
                autoComplete="off"
              />
              <Select
                label="Rows per page"
                options={pageSizeOptions}
                value={String(pageSize)}
                onChange={(value) => setPageSize(Number(value))}
              />
          </InlineGrid>

          {isLoading ? (
            <SkeletonBodyText lines={8} />
          ) : (
            <BlockStack gap="400">
              <OrdersTable
                orders={ordersResult?.items || []}
                selectedOrderId={selectedOrderId}
                onSelect={setSelectedOrderId}
              />
              {ordersResult ? (
                <OrdersPagination
                  page={ordersResult.pagination.page}
                  pageSize={ordersResult.pagination.pageSize}
                  total={ordersResult.pagination.total}
                  totalPages={ordersResult.pagination.totalPages}
                  onPageChange={setPage}
                />
              ) : null}
            </BlockStack>
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

function OrdersPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <InlineStack align="space-between" blockAlign="center" gap="300">
      <Text as="p" tone="subdued">
        Showing {start}–{end} of {total} orders
      </Text>
      <Pagination
        label={`Page ${page} of ${totalPages}`}
        hasPrevious={page > 1}
        onPrevious={() => onPageChange(page - 1)}
        hasNext={page < totalPages}
        onNext={() => onPageChange(page + 1)}
      />
    </InlineStack>
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
  return (
    <IndexTable
      resourceName={{ singular: 'order', plural: 'orders' }}
      itemCount={orders.length}
      selectable={false}
      hasZebraStriping
      lastColumnSticky
      headings={[
        { title: 'Order' },
        { title: 'Customer' },
        { title: 'Amount', alignment: 'end' },
        { title: 'Status' },
        {
          title: 'Risk score',
          tooltipContent:
            'Orders scoring 50 or more are marked for review.',
        },
        { title: 'Expires' },
        { title: 'Actions', alignment: 'end' },
      ]}
      emptyState={
        <EmptySearchResult
          title="No COD orders found"
          description="Try changing the status filter or search query."
          withIllustration
        />
      }
    >
      {orders.map((order, index) => (
        <IndexTable.Row
          id={String(order.id)}
          key={order.id}
          position={index}
          selected={selectedOrderId === order.id}
        >
          <IndexTable.Cell>
            <Text as="span" fontWeight="semibold">
              {order.orderName || '#' + order.id}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <BlockStack gap="100">
              <Text as="span">{order.customerName || 'Unknown'}</Text>
              <Text as="span" tone="subdued">
                {order.customerPhone || order.customerEmail || 'No contact'}
              </Text>
            </BlockStack>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" alignment="end" numeric>
              {formatMoney(order.totalAmount, order.currency || 'VND')}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <StatusBadge status={order.status} />
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text
              as="span"
              tone={order.riskScore >= 50 ? 'caution' : undefined}
              fontWeight={order.riskScore >= 50 ? 'semibold' : 'regular'}
              numeric
            >
              {order.riskScore}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            {formatDateTime(order.expiresAt)}
          </IndexTable.Cell>
          <IndexTable.Cell>
            <InlineStack align="end">
              <Button size="slim" onClick={() => onSelect(order.id)}>
                View details
              </Button>
            </InlineStack>
          </IndexTable.Cell>
        </IndexTable.Row>
      ))}
    </IndexTable>
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
        <List type="bullet">
          {reasons.map((reason) => (
            <List.Item key={reason}>
              {formatRiskReason(reason, riskRules)}
            </List.Item>
          ))}
        </List>
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
      <IndexTable
        resourceName={{ singular: 'line item', plural: 'line items' }}
        itemCount={items.length}
        selectable={false}
        headings={[
          { title: 'Product' },
          { title: 'SKU' },
          { title: 'Quantity', alignment: 'end' },
          { title: 'Price', alignment: 'end' },
        ]}
      >
        {items.map((item, index) => (
          <IndexTable.Row
            id={`${item.sku || item.title}-${index}`}
            key={`${item.sku || item.title}-${index}`}
            position={index}
          >
            <IndexTable.Cell>
              {compact([item.title, item.variantTitle]) || '-'}
            </IndexTable.Cell>
            <IndexTable.Cell>{item.sku || '-'}</IndexTable.Cell>
            <IndexTable.Cell>
              <Text as="span" alignment="end" numeric>
                {item.quantity}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as="span" alignment="end" numeric>
                {formatMoney(item.price, currency || 'VND')}
              </Text>
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>
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
        <Box
          key={item.id}
          borderWidth="025"
          borderColor="border"
          borderRadius="200"
          padding="300"
        >
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
        </Box>
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

  const scoredBlacklist = reason.match(
    /^blacklist:(phone|email|address):(\d+)$/,
  );

  if (scoredBlacklist) {
    const names = {
      phone: 'Phone number matched the blacklist',
      email: 'Email address matched the blacklist',
      address: 'Shipping address matched the blacklist',
    };

    return `${names[scoredBlacklist[1] as keyof typeof names]} (+${scoredBlacklist[2]})`;
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
