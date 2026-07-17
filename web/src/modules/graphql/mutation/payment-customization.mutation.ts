export const COD_PAYMENT_CUSTOMIZATION = `#graphql
  query CodPaymentCustomization($id: ID!) {
    node(id: $id) {
      ... on PaymentCustomization {
        id
      }
    }
  }
`;

export const CREATE_COD_PAYMENT_CUSTOMIZATION = `#graphql
  mutation CreateCodPaymentCustomization(
    $paymentCustomization: PaymentCustomizationInput!
  ) {
    paymentCustomizationCreate(
      paymentCustomization: $paymentCustomization
    ) {
      paymentCustomization {
        id
        enabled
        metafield(
          namespace: "$app:hide-cod-payment"
          key: "function-configuration"
        ) {
          id
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const SET_COD_PAYMENT_CONFIGURATION = `#graphql
  mutation SetCodPaymentConfiguration($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const SET_COD_PAYMENT_ACTIVATION = `#graphql
  mutation SetCodPaymentActivation($enabled: Boolean!, $ids: [ID!]!) {
    paymentCustomizationActivation(enabled: $enabled, ids: $ids) {
      ids
      userErrors {
        field
        message
        code
      }
    }
  }
`;
