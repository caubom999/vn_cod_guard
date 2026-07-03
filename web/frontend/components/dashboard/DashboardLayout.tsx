import { BlockStack, Layout, Page } from '@shopify/polaris';
import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <Page title="Limit/Block cash on delivery">
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
