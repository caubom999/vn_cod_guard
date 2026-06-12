export const GET_SHOPIFY_ORDER_NOTE = `#graphql
  query GetOrderNote($id: ID!) {
    order(id: $id) {
      id
      note
    }
  }
`;
