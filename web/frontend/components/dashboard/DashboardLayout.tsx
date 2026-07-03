import { BlockStack, Layout, Page } from '@shopify/polaris';
import { Outlet, useLocation } from 'react-router-dom';

const pageDetails: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Monitor COD confirmations, risk, and follow-up activity.',
  },
  '/orders': {
    title: 'Orders',
    subtitle: 'Review COD orders, customer decisions, and risk details.',
  },
  '/cod-fee': {
    title: 'COD controls',
    subtitle: 'Configure COD visibility rules and order fees.',
  },
  '/billing': {
    title: 'Billing',
    subtitle: 'Manage your subscription and monthly COD order usage.',
  },
  '/settings': {
    title: 'Settings',
    subtitle:
      'Configure how COD orders are matched, verified, tagged, and followed up.',
  },
  '/templates': {
    title: 'Message templates',
    subtitle:
      'Edit customer messages, choose a design, and preview outgoing email.',
  },
  '/blacklist': {
    title: 'Blacklist',
    subtitle: 'Monitor customer details associated with risky COD orders.',
  },
  '/analytics': {
    title: 'Analytics',
    subtitle: 'Understand COD performance and configure risk scoring rules.',
  },
};

export default function DashboardLayout() {
  const location = useLocation();
  const details = pageDetails[location.pathname] || pageDetails['/'];

  return (
    <Page title={details.title} subtitle={details.subtitle} fullWidth>
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Outlet />
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
