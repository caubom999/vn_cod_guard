import {
  BlockStack,
  ComplexAction,
  ButtonProps,
  ButtonGroup,
  buttonsFrom,
  Banner,
} from '@shopify/polaris';
import { ReactNode, useEffect, useState } from 'react';

export default function BannerMessage(props: {
  type: 'critical' | 'info' | 'success' | 'warning';
  message: ReactNode;
  title?: string;
  actions?: (ComplexAction & Partial<ButtonProps>)[];
  onClose?: () => void;
}) {
  const { title, message, type, actions, onClose } = props;

  const [show, setShow] = useState(true);

  useEffect(() => setShow(!!message), [message]);

  if (!show) {
    return null;
  }

  const actionMarkup = actions ? (
    <ButtonGroup>{buttonsFrom(actions)}</ButtonGroup>
  ) : null;

  return (
    <Banner
      onDismiss={() => {
        setShow(false);
        if (onClose) {
          onClose();
        }
      }}
      title={title}
      tone={type}
    >
      <BlockStack gap={'200'}>
        {message}
        {actionMarkup}
      </BlockStack>
    </Banner>
  );
}
