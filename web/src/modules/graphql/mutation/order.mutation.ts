export const ADD_SHOPIFY_TAGS = `#graphql
  mutation AddShopifyTags($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const REMOVE_SHOPIFY_TAGS = `#graphql
  mutation RemoveShopifyTags($id: ID!, $tags: [String!]!) {
    tagsRemove(id: $id, tags: $tags) {
      userErrors {
        field
        message
      }
    }
  }
`;

export const UPDATE_SHOPIFY_ORDER_NOTE = `#graphql
  mutation UpdateOrderNote($input: OrderInput!) {
    orderUpdate(input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;

export const CANCEL_SHOPIFY_ORDER = `#graphql
  mutation CancelCodOrder($orderId: ID!) {
    orderCancel(
      orderId: $orderId,
      reason: CUSTOMER,
      restock: true,
      notifyCustomer: false,
      refund: false
    ) {
      job { id }
      userErrors {
        field
        message
      }
    }
  }
`;
