export const COD_DELIVERY_CUSTOMIZATION = `#graphql
  query CodDeliveryCustomization($id: ID!) {
    node(id: $id) {
      ... on DeliveryCustomization {
        id
      }
    }
  }
`;

export const CREATE_COD_DELIVERY_CUSTOMIZATION = `#graphql
  mutation CreateCodDeliveryCustomization(
    $deliveryCustomization: DeliveryCustomizationInput!
  ) {
    deliveryCustomizationCreate(
      deliveryCustomization: $deliveryCustomization
    ) {
      deliveryCustomization {
        id
        enabled
        metafield(
          namespace: "$app:hide-cod-delivery"
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

export const SET_COD_DELIVERY_CONFIGURATION = `#graphql
  mutation SetCodDeliveryConfiguration($metafields: [MetafieldsSetInput!]!) {
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

export const SET_COD_DELIVERY_ACTIVATION = `#graphql
  mutation SetCodDeliveryActivation($enabled: Boolean!, $ids: [ID!]!) {
    deliveryCustomizationActivation(enabled: $enabled, ids: $ids) {
      ids
      userErrors {
        field
        message
        code
      }
    }
  }
`;
