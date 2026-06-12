import {
  Badge,
  BlockStack,
  Card,
  InlineStack,
  Layout,
  Page,
  SkeletonBodyText,
  Text,
} from '@shopify/polaris';
import { Outlet } from 'react-router-dom';
import { useCurrentShop } from '../../hook/shop';
import { ErrorBanner, ShopFact } from './screens';

export default function DashboardLayout() {
  const {
    data: shop,
    isLoading: isShopLoading,
    error: shopError,
  } = useCurrentShop();

  return (
    <Page title="Vietnam COD Guard">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {shopError ? <ErrorBanner error={shopError} /> : null}

            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Vietnam COD order guard
                  </Text>
                  <Badge tone={shop ? 'success' : 'attention'}>
                    {shop ? 'Connected' : 'Checking'}
                  </Badge>
                </InlineStack>

                {isShopLoading ? (
                  <SkeletonBodyText lines={3} />
                ) : (
                  <InlineStack gap="600" wrap>
                    <ShopFact label="Shop" value={shop?.name || shop?.domain} />
                    <ShopFact label="Domain" value={shop?.domain} />
                    <ShopFact
                      label="Email"
                      value={shop?.email || 'Not provided'}
                    />
                  </InlineStack>
                )}
              </BlockStack>
            </Card>

            <Outlet />
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
