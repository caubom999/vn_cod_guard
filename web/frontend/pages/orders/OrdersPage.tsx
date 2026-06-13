import {
  BlockStack,
  Button,
  Card,
  InlineStack,
  Select,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import { useEffect, useState } from 'react';
import {
  type CodOrderDetail,
  type CodOrderSummary,
  useCodOrderDetail,
  useCodOrders,
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

export default function OrdersPage() {
  return <OrdersScreen />;
}

