export const BEGIN_COD_FEE_ORDER_EDIT = `#graphql
  mutation BeginCodFeeOrderEdit($id: ID!) {
    orderEditBegin(id: $id) {
      calculatedOrder {
        id
        lineItems(first: 250) {
          nodes {
            title
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const ADD_COD_FEE_CUSTOM_ITEM = `#graphql
  mutation AddCodFeeCustomItem(
    $id: ID!
    $title: String!
    $price: MoneyInput!
  ) {
    orderEditAddCustomItem(
      id: $id
      title: $title
      price: $price
      quantity: 1
      requiresShipping: false
      taxable: false
    ) {
      calculatedLineItem {
        id
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const COMMIT_COD_FEE_ORDER_EDIT = `#graphql
  mutation CommitCodFeeOrderEdit($id: ID!) {
    orderEditCommit(
      id: $id
      notifyCustomer: false
      staffNote: "COD fee added by Limit/Block cash on delivery"
    ) {
      order {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;
