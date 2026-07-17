import { ReactNode } from 'react';
import {
  BlockStack,
  Text,
  type ButtonProps,
  Button,
  InlineGrid,
  Page,
} from '@shopify/polaris';

export type HelpdeskMethod = Partial<ButtonProps> & {
  title: ReactNode;
  helpText?: ReactNode;
};

export type HelpdeskProps = {
  title?: ReactNode;
  methods: HelpdeskMethod[];
};

export default function Helpdesk(props: HelpdeskProps) {
  const { methods = [] } = props;

  return (
    <Page title={'Need any help?'}>
      <InlineGrid
        gap={'500'}
        columns={{ xs: 2, md: Math.min(methods.length, 3) }}
      >
        {methods.map((method, idx) => {
          const { title, helpText, ...rest } = method;
          return (
            <BlockStack key={idx} gap={'100'}>
              <Button {...rest}>{title as any}</Button>
              {helpText ? (
                typeof helpText === 'string' ? (
                  <Text as="p" tone="subdued">
                    {helpText}
                  </Text>
                ) : (
                  helpText
                )
              ) : null}
            </BlockStack>
          );
        })}
      </InlineGrid>
    </Page>
  );
}
