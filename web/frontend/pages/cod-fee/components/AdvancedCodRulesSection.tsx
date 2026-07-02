import {
  BlockStack,
  Card,
  Checkbox,
  Divider,
  InlineGrid,
  Text,
  TextField,
} from '@shopify/polaris';
import { useState } from 'react';
import type {
  AdvancedCodRulesSectionProps,
  CodDeliveryAdvancedRuleDraft,
} from '../../../types/cod-fee';
import { HideCodPaymentMethodSection } from './HideCodPaymentMethodSection';

type ListRuleKey = {
  [K in keyof CodDeliveryAdvancedRuleDraft]: CodDeliveryAdvancedRuleDraft[K] extends string
    ? K
    : never;
}[keyof CodDeliveryAdvancedRuleDraft];

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
        title="Limit cash on delivery by order"
        description="Control COD availability using the order total and discounts."
      >
        <HideCodPaymentMethodSection {...paymentRule} />
        <Divider />
        <Checkbox
          label="Hide COD when the order has discounts"
          checked={rules.hideDiscountedOrders}
          onChange={(value) => setRule('hideDiscountedOrders', value)}
          disabled={disabled}
        />
      </RuleSection>

      <RuleSection
        title="Limit cash on delivery by customers"
        description="Control COD using customer tags, email addresses, and phone numbers."
      >
        {listRule({
          ruleKey: 'hideCustomerTags',
          label: 'Hide COD if the customer has one or more tags',
          placeholder: 'vip, blocked',
        })}
        {listRule({
          ruleKey: 'requireCustomerTags',
          label: 'Show COD only if the customer has specific tags',
          placeholder: 'trusted, cod-allowed',
        })}
        <Divider />
        {listRule({
          ruleKey: 'hideCustomerEmails',
          label: 'Hide COD for one or more email addresses',
          placeholder: 'customer@example.com',
        })}
        {listRule({
          ruleKey: 'hideCustomerPhones',
          label: 'Hide COD for one or more phone numbers',
          placeholder: '+84901234567',
          helpText:
            'Separate multiple phone numbers with commas. Formatting characters are ignored.',
        })}
      </RuleSection>

      <RuleSection
        title="Limit cash on delivery by location"
        description="Control COD availability for countries, provinces, and postal codes."
      >
        {listRule({
          ruleKey: 'hideCountries',
          label: 'Hide COD for one or more countries',
          placeholder: 'VN, US',
          helpText: 'Use two-letter country codes separated by commas.',
        })}
        {listRule({
          ruleKey: 'requireCountries',
          label: 'Show COD only for specific countries',
          placeholder: 'VN',
          helpText: 'Use two-letter country codes separated by commas.',
        })}
        <Divider />
        {listRule({
          ruleKey: 'hideProvinces',
          label: 'Hide COD for one or more provinces/states',
          placeholder: 'HN, SG',
          helpText: 'Use Shopify province/state codes separated by commas.',
        })}
        {listRule({
          ruleKey: 'requireProvinces',
          label: 'Show COD only for specific provinces/states',
          placeholder: 'HN, SG',
          helpText: 'Use Shopify province/state codes separated by commas.',
        })}
        <Divider />
        {listRule({
          ruleKey: 'hidePostalCodes',
          label: 'Hide COD for one or more postal codes',
          placeholder: '100000, 700000',
        })}
        {listRule({
          ruleKey: 'requirePostalCodes',
          label: 'Show COD only for specific postal codes',
          placeholder: '100000, 700000',
        })}
      </RuleSection>

      <RuleSection
        title="Limit cash on delivery by products"
        description="Control COD using products, gift cards, collections, and vendors."
      >
        {listRule({
          ruleKey: 'hideProductIds',
          label: 'Hide COD for one or more products',
          placeholder: 'gid://shopify/Product/123',
          helpText: 'Enter Shopify product GIDs separated by commas.',
        })}
        <Checkbox
          label="Hide COD for gift cards"
          checked={rules.hideGiftCards}
          onChange={(value) => setRule('hideGiftCards', value)}
          disabled={disabled}
        />
        <Divider />
        {listRule({
          ruleKey: 'hideCollectionIds',
          label: 'Hide COD for one or more collections',
          placeholder: 'gid://shopify/Collection/123',
          helpText: 'Enter Shopify collection GIDs separated by commas.',
        })}
        {listRule({
          ruleKey: 'requireCollectionIds',
          label: 'Show COD only for specific collections',
          placeholder: 'gid://shopify/Collection/123',
          helpText: 'Enter Shopify collection GIDs separated by commas.',
        })}
        <Divider />
        {listRule({
          ruleKey: 'hideProductVendors',
          label: 'Hide COD for one or more product vendors',
          placeholder: 'Vendor A, Vendor B',
        })}
        {listRule({
          ruleKey: 'requireProductVendors',
          label: 'Show COD only for specific product vendors',
          placeholder: 'Vendor A, Vendor B',
        })}
      </RuleSection>

      <RuleSection
        title="Limit cash on delivery by shipping method"
        description="Control COD for shipping rates, local pickup, and local delivery."
      >
        {listRule({
          ruleKey: 'hideShippingRates',
          label: 'Hide COD for one or more shipping rates',
          placeholder: 'Express, International Shipping',
          helpText: 'Enter exact shipping rate titles or codes.',
        })}
        {listRule({
          ruleKey: 'requireShippingRates',
          label: 'Show COD only for specific shipping rates',
          placeholder: 'Standard, Economy',
          helpText: 'Enter exact shipping rate titles or codes.',
        })}
        <Divider />
        <Checkbox
          label="Hide COD for local pickup orders"
          checked={rules.hideLocalPickup}
          onChange={(value) => setRule('hideLocalPickup', value)}
          disabled={disabled}
        />
        <Checkbox
          label="Show COD only for local pickup orders"
          checked={rules.requireLocalPickup}
          onChange={(value) => setRule('requireLocalPickup', value)}
          disabled={disabled}
        />
        <Divider />
        <Checkbox
          label="Hide COD for local delivery orders"
          checked={rules.hideLocalDelivery}
          onChange={(value) => setRule('hideLocalDelivery', value)}
          disabled={disabled}
        />
        <Checkbox
          label="Show COD only for local delivery orders"
          checked={rules.requireLocalDelivery}
          onChange={(value) => setRule('requireLocalDelivery', value)}
          disabled={disabled}
        />
      </RuleSection>
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
