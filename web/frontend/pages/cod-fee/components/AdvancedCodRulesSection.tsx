import {
  Autocomplete,
  BlockStack,
  Card,
  Checkbox,
  Divider,
  InlineGrid,
  Text,
  TextField,
} from '@shopify/polaris';
import { useMemo, useState } from 'react';
import type {
  AdvancedCodRulesSectionProps,
  CodPaymentAdvancedRuleDraft,
} from '../../../types/cod-fee';
import { COUNTRY_OPTIONS } from '../country-options';
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
        {listRule({
          ruleKey: 'hideCustomerPhones',
          label: 'Hide COD payment for one or more phone numbers',
          placeholder: '+84901234567',
          helpText:
            'Separate multiple phone numbers with commas. Formatting characters are ignored.',
        })}
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
        {listRule({
          ruleKey: 'hideProductIds',
          label: 'Hide COD payment for one or more products',
          placeholder: 'gid://shopify/Product/123',
          helpText: 'Enter Shopify product GIDs separated by commas.',
        })}
        <Checkbox
          label="Hide COD payment for gift cards"
          checked={rules.hideGiftCards}
          onChange={(value) => setRule('hideGiftCards', value)}
          disabled={disabled}
        />
        <Divider />
        {listRule({
          ruleKey: 'hideCollectionIds',
          label: 'Hide COD payment for one or more collections',
          placeholder: 'gid://shopify/Collection/123',
          helpText: 'Enter Shopify collection GIDs separated by commas.',
        })}
        {listRule({
          ruleKey: 'requireCollectionIds',
          label: 'Show COD payment only for specific collections',
          placeholder: 'gid://shopify/Collection/123',
          helpText: 'Enter Shopify collection GIDs separated by commas.',
        })}
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
