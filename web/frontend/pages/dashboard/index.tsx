import {
  Badge,
  BlockStack,
  Box,
  Card,
  InlineStack,
  Layout,
  Page,
  SkeletonBodyText,
  Text,
} from '@shopify/polaris';
import { useCurrentShop } from '../../hook/shop';

export default function Dashboard() {
  const { data: shop, isLoading, error } = useCurrentShop();

  return (
    <Page title="VN-Cod-Guard">
      <Layout>
        <Layout.Section>
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

              {isLoading ? (
                <SkeletonBodyText lines={4} />
              ) : error ? (
                <Text as="p" tone="critical">
                  {(error as Error).message}
                </Text>
              ) : (
                <Box>
                  <BlockStack gap="200">
                    <Text as="p">
                      <Text as="span" fontWeight="semibold">
                        Shop:
                      </Text>{' '}
                      {shop?.name || shop?.domain}
                    </Text>
                    <Text as="p">
                      <Text as="span" fontWeight="semibold">
                        Domain:
                      </Text>{' '}
                      {shop?.domain}
                    </Text>
                    <Text as="p">
                      <Text as="span" fontWeight="semibold">
                        Email:
                      </Text>{' '}
                      {shop?.email || 'Not provided'}
                    </Text>
                  </BlockStack>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
