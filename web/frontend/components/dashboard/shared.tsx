import {
  Badge,
  Banner,
  BlockStack,
  Card,
  InlineStack,
  SkeletonBodyText,
  Text,
} from '@shopify/polaris';
import type { CSSProperties, ReactNode } from 'react';
import type { CodOrderStatus } from '../../hook/cod-dashboard';

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div style={metricGridStyle}>{children}</div>;
}

export function MetricCard({
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

export function StatusBadge({ status }: { status: CodOrderStatus }) {
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

export function ErrorBanner({ error }: { error: unknown }) {
  return (
    <Banner tone="critical">
      <Text as="p">{(error as Error).message}</Text>
    </Banner>
  );
}

export function EmptyText({ text }: { text: string }) {
  return (
    <Text as="p" tone="subdued">
      {text}
    </Text>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th style={thStyle}>{children}</th>;
}

export function Td({ children }: { children: ReactNode }) {
  return <td style={tdStyle}>{children}</td>;
}

export function formatPercent(value?: number | null) {
  if (value === undefined || value === null) {
    return '0%';
  }

  return value.toFixed(1) + '%';
}

export function formatNumber(value?: number | null) {
  return Intl.NumberFormat('vi-VN').format(value || 0);
}

export function formatMoney(value?: string | number | null, currency = 'VND') {
  const amount = Number(value || 0);

  return Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'VND' ? 0 : 2,
  }).format(amount);
}

export function formatDateTime(value?: string | null) {
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

export function formatJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '-';
  }
}

export function compact(values: Array<string | null | undefined>) {
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

export const metricGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '16px',
};

export const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
};

export const filterFieldStyle: CSSProperties = {
  minWidth: 220,
};

export const searchFieldStyle: CSSProperties = {
  minWidth: 320,
  flex: 1,
};

export const dividerWrapStyle: CSSProperties = {
  paddingTop: 20,
};

export const tableStyle: CSSProperties = {
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

export const selectedRowStyle: CSSProperties = {
  background: '#f1f8ff',
};

export const timelineItemStyle: CSSProperties = {
  border: '1px solid #dfe3e8',
  borderRadius: 8,
  padding: 12,
};
