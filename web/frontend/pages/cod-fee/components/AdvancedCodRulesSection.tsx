import {
  Autocomplete,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  InlineGrid,
  InlineStack,
  Select,
  Tag,
  Text,
  TextField,
  Thumbnail,
} from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';
import { CollectionIcon, ProductIcon, XIcon } from '@shopify/polaris-icons';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';
import { useMemo, useState } from 'react';
import {
  useCodCollections,
  useCodProducts,
} from '../../../hook/cod-payment-rule';
import type {
  AdvancedCodRulesSectionProps,
  CodCollection,
  CodPaymentAdvancedRuleDraft,
  CodProduct,
} from '../../../types/cod-fee';
import { COUNTRY_OPTIONS, PHONE_COUNTRY_OPTIONS } from '../country-options';
import { HideCodPaymentMethodSection } from './HideCodPaymentMethodSection';

type ListRuleKey = {
  [K in keyof CodPaymentAdvancedRuleDraft]: CodPaymentAdvancedRuleDraft[K] extends string
    ? K
    : never;
}[keyof CodPaymentAdvancedRuleDraft];

type ListRuleProps = {
  ruleKey: ListRuleKey;
  label: string;
  placeholder: string;
  helpText?: string;
};

export function AdvancedCodRulesSection({
  rules,
  setRule,
  disabled,
  paymentRule,
}: AdvancedCodRulesSectionProps) {
  const [expanded, setExpanded] = useState<Set<ListRuleKey>>(new Set());

  const listRule = ({
    ruleKey,
    label,
    placeholder,
    helpText = 'Separate multiple values with commas.',
  }: ListRuleProps) => {
    const value = rules[ruleKey] as string;
    const checked = expanded.has(ruleKey) || Boolean(value.trim());

    return (
      <BlockStack gap="200">
        <Checkbox
          label={label}
          checked={checked}
          disabled={disabled}
          onChange={(nextChecked) => {
            setExpanded((current) => {
              const next = new Set(current);

              if (nextChecked) {
                next.add(ruleKey);
              } else {
                next.delete(ruleKey);
                setRule(ruleKey, '');
              }

              return next;
            });
          }}
        />
        {checked ? (
          <TextField
            label={label}
            labelHidden
            value={value}
            onChange={(nextValue) => setRule(ruleKey, nextValue)}
            placeholder={placeholder}
            helpText={helpText}
            autoComplete="off"
            disabled={disabled}
          />
        ) : null}
      </BlockStack>
    );
  };

  return (
    <BlockStack gap="400">
      <RuleSection
        title="Limit COD payment by order"
        description="Control COD availability using the order total and discounts."
      >
        <HideCodPaymentMethodSection {...paymentRule} />
      </RuleSection>

      <RuleSection
        title="Limit COD payment by customers"
        description="Control COD using customer tags, email addresses, and phone numbers."
      >
        {listRule({
          ruleKey: 'hideCustomerTags',
          label: 'Hide COD payment if the customer has one or more tags',
          placeholder: 'vip, blocked',
        })}
        {listRule({
          ruleKey: 'requireCustomerTags',
          label: 'Show COD payment only if the customer has specific tags',
          placeholder: 'trusted, cod-allowed',
        })}
        <Divider />
        {listRule({
          ruleKey: 'hideCustomerEmails',
          label: 'Hide COD payment for one or more email addresses',
          placeholder: 'customer@example.com',
        })}
        <PhoneNumberRule
          value={rules.hideCustomerPhones}
          disabled={disabled}
          onChange={(value) => setRule('hideCustomerPhones', value)}
        />
      </RuleSection>

      <RuleSection
        title="Limit COD payment by location"
        description="Control COD availability for countries, provinces, and postal codes."
      >
        <CountryCodeRule
          label="Hide COD payment for one or more countries"
          value={rules.hideCountries}
          disabled={disabled}
          onChange={(value) => setRule('hideCountries', value)}
        />
        <CountryCodeRule
          label="Show COD payment only for specific countries"
          value={rules.requireCountries}
          disabled={disabled}
          onChange={(value) => setRule('requireCountries', value)}
        />
        <Divider />
        {listRule({
          ruleKey: 'hideProvinces',
          label: 'Hide COD payment for one or more provinces/states',
          placeholder: 'HN, SG',
          helpText: 'Use Shopify province/state codes separated by commas.',
        })}
        {listRule({
          ruleKey: 'requireProvinces',
          label: 'Show COD payment only for specific provinces/states',
          placeholder: 'HN, SG',
          helpText: 'Use Shopify province/state codes separated by commas.',
        })}
        <Divider />
        {listRule({
          ruleKey: 'hidePostalCodes',
          label: 'Hide COD payment for one or more postal codes',
          placeholder: '100000, 700000',
        })}
        {listRule({
          ruleKey: 'requirePostalCodes',
          label: 'Show COD payment only for specific postal codes',
          placeholder: '100000, 700000',
        })}
      </RuleSection>

      <RuleSection
        title="Limit COD payment by products"
        description="Control COD using products, gift cards, collections, and vendors."
      >
        <ProductRule
          value={rules.hideProductIds}
          disabled={disabled}
          onChange={(value) => setRule('hideProductIds', value)}
        />
        <Checkbox
          label="Hide COD payment for gift cards"
          checked={rules.hideGiftCards}
          onChange={(value) => setRule('hideGiftCards', value)}
          disabled={disabled}
        />
        <Divider />
        <CollectionRule
          mode="hide"
          value={rules.hideCollectionIds}
          disabled={disabled}
          onChange={(value) => setRule('hideCollectionIds', value)}
        />
        <CollectionRule
          mode="require"
          value={rules.requireCollectionIds}
          disabled={disabled}
          onChange={(value) => setRule('requireCollectionIds', value)}
        />
        <Divider />
        {listRule({
          ruleKey: 'hideProductVendors',
          label: 'Hide COD payment for one or more product vendors',
          placeholder: 'Vendor A, Vendor B',
        })}
        {listRule({
          ruleKey: 'requireProductVendors',
          label: 'Show COD payment only for specific product vendors',
          placeholder: 'Vendor A, Vendor B',
        })}
      </RuleSection>

      <RuleSection
        title="Limit COD payment by shipping method"
        description="Control COD for shipping rates, local pickup, and local delivery."
      >
        {listRule({
          ruleKey: 'hideShippingRates',
          label: 'Hide COD payment for one or more shipping rates',
          placeholder: 'Express, International Shipping',
          helpText: 'Enter exact shipping rate titles or codes.',
        })}
        {listRule({
          ruleKey: 'requireShippingRates',
          label: 'Show COD payment only for specific shipping rates',
          placeholder: 'Standard, Economy',
          helpText: 'Enter exact shipping rate titles or codes.',
        })}
        <Divider />
        <Checkbox
          label="Hide COD payment for local pickup orders"
          checked={rules.hideLocalPickup}
          onChange={(value) => setRule('hideLocalPickup', value)}
          disabled={disabled}
        />
        <Checkbox
          label="Show COD payment only for local pickup orders"
          checked={rules.requireLocalPickup}
          onChange={(value) => setRule('requireLocalPickup', value)}
          disabled={disabled}
        />
        <Divider />
        <Checkbox
          label="Hide COD payment for local delivery orders"
          checked={rules.hideLocalDelivery}
          onChange={(value) => setRule('hideLocalDelivery', value)}
          disabled={disabled}
        />
        <Checkbox
          label="Show COD payment only for local delivery orders"
          checked={rules.requireLocalDelivery}
          onChange={(value) => setRule('requireLocalDelivery', value)}
          disabled={disabled}
        />
      </RuleSection>
    </BlockStack>
  );
}

function ProductRule({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const shopify = useAppBridge();
  const productIds = useMemo(
    () =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    [value],
  );
  const productsQuery = useCodProducts(productIds);
  const [expanded, setExpanded] = useState(Boolean(productIds.length));
  const [picking, setPicking] = useState(false);
  const [pickedProducts, setPickedProducts] = useState<CodProduct[]>([]);
  const checked = expanded || productIds.length > 0;
  const products = useMemo(() => {
    const byId = new Map<string, CodProduct>();

    for (const product of productsQuery.data?.products || []) {
      byId.set(product.id, product);
    }

    for (const product of pickedProducts) {
      byId.set(product.id, product);
    }

    return productIds.map(
      (id) =>
        byId.get(id) || {
          id,
          title: `Product ${getNumericId(id)}`,
          imageUrl: null,
          imageAlt: '',
        },
    );
  }, [pickedProducts, productIds, productsQuery.data?.products]);

  const selectProducts = async () => {
    setPicking(true);

    try {
      const selection = await shopify.resourcePicker({
        type: 'product',
        action: 'select',
        multiple: 50,
        selectionIds: productIds.map((id) => ({ id })),
        filter: {
          variants: false,
          draft: false,
          archived: false,
        },
      });

      if (!selection) {
        return;
      }

      const selectedProducts = selection.selection || selection;
      const summaries = selectedProducts.map((product) => ({
        id: product.id,
        title: product.title,
        imageUrl: product.images?.[0]?.originalSrc || null,
        imageAlt: product.images?.[0]?.altText || product.title,
      }));

      setPickedProducts(summaries);
      onChange(summaries.map((product) => product.id).join(', '));
    } finally {
      setPicking(false);
    }
  };

  const removeProduct = (id: string) => {
    onChange(productIds.filter((productId) => productId !== id).join(', '));
    setPickedProducts((current) =>
      current.filter((product) => product.id !== id),
    );
  };

  return (
    <BlockStack gap="200">
      <Checkbox
        label="Hide COD payment for one or more products"
        checked={checked}
        disabled={disabled}
        onChange={(nextChecked) => {
          setExpanded(nextChecked);

          if (!nextChecked) {
            onChange('');
            setPickedProducts([]);
          }
        }}
      />
      {checked ? (
        <Box background="bg-surface-secondary" borderRadius="300" padding="400">
          <BlockStack gap="300">
            <Text as="p">
              COD payment will be hidden when any selected product is in the
              cart.
            </Text>
            <InlineStack>
              <Button
                onClick={selectProducts}
                loading={picking}
                disabled={disabled}
              >
                Browse products
              </Button>
            </InlineStack>

            {productsQuery.error ? (
              <Text as="p" tone="critical">
                {(productsQuery.error as Error).message}
              </Text>
            ) : null}

            {products.length ? (
              <BlockStack gap="200">
                {products.map((product) => (
                  <Box
                    key={product.id}
                    background="bg-surface"
                    borderRadius="200"
                    padding="300"
                  >
                    <InlineStack
                      align="space-between"
                      blockAlign="center"
                      gap="300"
                      wrap={false}
                    >
                      <InlineStack blockAlign="center" gap="300" wrap={false}>
                        <Thumbnail
                          source={product.imageUrl || ProductIcon}
                          alt={product.imageAlt || product.title}
                          size="small"
                        />
                        <BlockStack gap="050">
                          <Text as="p" fontWeight="semibold">
                            {product.title}
                          </Text>
                          <Text as="p" tone="subdued" variant="bodySm">
                            Product ID: {getNumericId(product.id)}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                      <Button
                        icon={XIcon}
                        variant="tertiary"
                        tone="critical"
                        accessibilityLabel={`Remove ${product.title}`}
                        onClick={() => removeProduct(product.id)}
                        disabled={disabled}
                      />
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            ) : (
              <Text as="p" tone="subdued">
                No products selected.
              </Text>
            )}

            <Text as="p" tone="subdued" variant="bodySm">
              You can select up to 50 products.
            </Text>
          </BlockStack>
        </Box>
      ) : null}
    </BlockStack>
  );
}

function CollectionRule({
  mode,
  value,
  disabled,
  onChange,
}: {
  mode: 'hide' | 'require';
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const shopify = useAppBridge();
  const collectionIds = useMemo(
    () =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    [value],
  );
  const collectionsQuery = useCodCollections(collectionIds);
  const [expanded, setExpanded] = useState(Boolean(collectionIds.length));
  const [picking, setPicking] = useState(false);
  const [pickedCollections, setPickedCollections] = useState<CodCollection[]>(
    [],
  );
  const checked = expanded || collectionIds.length > 0;
  const collections = useMemo(() => {
    const byId = new Map<string, CodCollection>();

    for (const collection of collectionsQuery.data?.collections || []) {
      byId.set(collection.id, collection);
    }

    for (const collection of pickedCollections) {
      byId.set(collection.id, collection);
    }

    return collectionIds.map(
      (id) =>
        byId.get(id) || {
          id,
          title: `Collection ${getNumericId(id)}`,
          imageUrl: null,
          imageAlt: '',
        },
    );
  }, [
    collectionIds,
    collectionsQuery.data?.collections,
    pickedCollections,
  ]);
  const label =
    mode === 'hide'
      ? 'Hide COD payment for one or more collections'
      : 'Show COD payment only for specific collections';

  const selectCollections = async () => {
    setPicking(true);

    try {
      const selection = await shopify.resourcePicker({
        type: 'collection',
        action: 'select',
        multiple: 50,
        selectionIds: collectionIds.map((id) => ({ id })),
      });

      if (!selection) {
        return;
      }

      const selectedCollections = selection.selection || selection;
      const summaries = selectedCollections.map((collection) => ({
        id: collection.id,
        title: collection.title,
        imageUrl: collection.image?.originalSrc || null,
        imageAlt: collection.image?.altText || collection.title,
      }));

      setPickedCollections(summaries);
      onChange(summaries.map((collection) => collection.id).join(', '));
    } finally {
      setPicking(false);
    }
  };

  const removeCollection = (id: string) => {
    onChange(
      collectionIds.filter((collectionId) => collectionId !== id).join(', '),
    );
    setPickedCollections((current) =>
      current.filter((collection) => collection.id !== id),
    );
  };

  return (
    <BlockStack gap="200">
      <Checkbox
        label={label}
        checked={checked}
        disabled={disabled}
        onChange={(nextChecked) => {
          setExpanded(nextChecked);

          if (!nextChecked) {
            onChange('');
            setPickedCollections([]);
          }
        }}
      />
      {checked ? (
        <Box background="bg-surface-secondary" borderRadius="300" padding="400">
          <BlockStack gap="300">
            <Text as="p">
              {mode === 'hide'
                ? 'COD payment will be hidden when the cart contains a product from any selected collection.'
                : 'COD payment will only be shown when the cart contains a product from a selected collection.'}
            </Text>
            <InlineStack>
              <Button
                onClick={selectCollections}
                loading={picking}
                disabled={disabled}
              >
                Browse collections
              </Button>
            </InlineStack>

            {collectionsQuery.error ? (
              <Text as="p" tone="critical">
                {(collectionsQuery.error as Error).message}
              </Text>
            ) : null}

            {collections.length ? (
              <BlockStack gap="200">
                {collections.map((collection) => (
                  <Box
                    key={collection.id}
                    background="bg-surface"
                    borderRadius="200"
                    padding="300"
                  >
                    <InlineStack
                      align="space-between"
                      blockAlign="center"
                      gap="300"
                      wrap={false}
                    >
                      <InlineStack blockAlign="center" gap="300" wrap={false}>
                        <Thumbnail
                          source={collection.imageUrl || CollectionIcon}
                          alt={collection.imageAlt || collection.title}
                          size="small"
                        />
                        <BlockStack gap="050">
                          <Text as="p" fontWeight="semibold">
                            {collection.title}
                          </Text>
                          <Text as="p" tone="subdued" variant="bodySm">
                            Collection ID: {getNumericId(collection.id)}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                      <Button
                        icon={XIcon}
                        variant="tertiary"
                        tone="critical"
                        accessibilityLabel={`Remove ${collection.title}`}
                        onClick={() => removeCollection(collection.id)}
                        disabled={disabled}
                      />
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            ) : (
              <Text as="p" tone="subdued">
                No collections selected.
              </Text>
            )}

            <Text as="p" tone="subdued" variant="bodySm">
              You can select up to 50 collections.
            </Text>
          </BlockStack>
        </Box>
      ) : null}
    </BlockStack>
  );
}

function getNumericId(id: string) {
  return id.split('/').pop() || id;
}

function CountryCodeRule({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const selected = useMemo(
    () =>
      value
        .split(',')
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean),
    [value],
  );
  const [expanded, setExpanded] = useState(Boolean(selected.length));
  const [search, setSearch] = useState('');
  const options = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return COUNTRY_OPTIONS;
    }

    return COUNTRY_OPTIONS.filter(
      (option) =>
        option.value.toLowerCase().includes(query) ||
        option.label.toLowerCase().includes(query),
    );
  }, [search]);
  const selectedLabels = selected.map(
    (code) =>
      COUNTRY_OPTIONS.find((option) => option.value === code)?.label || code,
  );
  const checked = expanded || selected.length > 0;

  return (
    <BlockStack gap="200">
      <Checkbox
        label={label}
        checked={checked}
        disabled={disabled}
        onChange={(nextChecked) => {
          setExpanded(nextChecked);

          if (!nextChecked) {
            onChange('');
            setSearch('');
          }
        }}
      />
      {checked ? (
        <Autocomplete
          allowMultiple
          options={options}
          selected={selected}
          onSelect={(codes) => {
            onChange(codes.join(', '));
            setSearch('');
          }}
          emptyState={
            <Text as="p" tone="subdued">
              No countries found
            </Text>
          }
          textField={
            <Autocomplete.TextField
              label={label}
              labelHidden
              value={search}
              onChange={setSearch}
              placeholder="Search by country name or code"
              autoComplete="off"
              disabled={disabled}
              helpText={
                selectedLabels.length
                  ? `Selected: ${selectedLabels.join(', ')}`
                  : 'Select one or more countries. ISO two-letter codes will be saved.'
              }
            />
          }
        />
      ) : null}
    </BlockStack>
  );
}

function PhoneNumberRule({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const phoneNumbers = useMemo(
    () =>
      value
        .split(',')
        .map((phone) => phone.trim())
        .filter(Boolean),
    [value],
  );
  const initialCountry =
    parsePhoneNumberFromString(phoneNumbers[0] || '')?.country || 'VN';
  const [expanded, setExpanded] = useState(Boolean(phoneNumbers.length));
  const [country, setCountry] = useState<string>(initialCountry);
  const [localNumber, setLocalNumber] = useState('');
  const [error, setError] = useState('');
  const checked = expanded || phoneNumbers.length > 0;

  const addPhoneNumber = () => {
    if (!localNumber.replace(/\D/g, '')) {
      setError('Enter a phone number.');
      return;
    }

    const parsed = parsePhoneNumberFromString(
      localNumber,
      country as CountryCode,
    );

    if (!parsed?.isPossible()) {
      setError('Enter a valid phone number for the selected country.');
      return;
    }

    const normalized = parsed.number;

    onChange([...new Set([...phoneNumbers, normalized])].join(', '));
    setLocalNumber('');
    setError('');
  };

  return (
    <BlockStack gap="200">
      <Checkbox
        label="Hide COD payment for one or more phone numbers"
        checked={checked}
        disabled={disabled}
        onChange={(nextChecked) => {
          setExpanded(nextChecked);

          if (!nextChecked) {
            onChange('');
            setLocalNumber('');
            setError('');
          }
        }}
      />
      {checked ? (
        <BlockStack gap="300">
          <InlineGrid
            columns={{ xs: 1, sm: ['oneThird', 'twoThirds'] }}
            gap="300"
            alignItems="end"
          >
            <Select
              label="Country code"
              options={PHONE_COUNTRY_OPTIONS}
              value={country}
              onChange={(nextCountry) => {
                setCountry(nextCountry);
                setError('');
              }}
              disabled={disabled}
            />
            <InlineGrid
              columns={{ xs: 1, sm: ['twoThirds', 'oneThird'] }}
              gap="300"
              alignItems="end"
            >
              <TextField
                label="Phone number"
                value={localNumber}
                onChange={(nextValue) => {
                  setLocalNumber(nextValue);
                  setError('');
                }}
                placeholder="123456789"
                type="tel"
                autoComplete="off"
                disabled={disabled}
                error={error}
              />
              <InlineStack align="start">
                <Button
                  onClick={addPhoneNumber}
                  disabled={disabled || !localNumber.trim()}
                >
                  Add
                </Button>
              </InlineStack>
            </InlineGrid>
          </InlineGrid>
          <Text as="p" tone="subdued">
            Enter the phone number without the leading zero.
          </Text>
          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">
              Blocked phone numbers
            </Text>
            <InlineStack gap="200" wrap>
              {phoneNumbers.map((phone) => (
                <Tag
                  key={phone}
                  onRemove={() =>
                    onChange(
                      phoneNumbers
                        .filter((current) => current !== phone)
                        .join(', '),
                    )
                  }
                  disabled={disabled}
                >
                  {phone}
                </Tag>
              ))}
            </InlineStack>
          </BlockStack>
        </BlockStack>
      ) : null}
    </BlockStack>
  );
}

function RuleSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <InlineGrid
      columns={{ xs: 1, md: ['oneThird', 'twoThirds'] }}
      gap={{ xs: '400', md: '600' }}
      alignItems="start"
    >
      <BlockStack gap="200">
        <Text as="h2" variant="headingMd">
          {title}
        </Text>
        {description ? (
          <Text as="p" tone="subdued">
            {description}
          </Text>
        ) : null}
      </BlockStack>

      <Card>
        <BlockStack gap="300">{children}</BlockStack>
      </Card>
    </InlineGrid>
  );
}
