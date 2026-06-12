export const CREATE_APP_SUBSCRIPTION = `#graphql
  mutation CreateVnCodGuardSubscription(
    $name: String!
    $returnUrl: URL!
    $trialDays: Int
    $test: Boolean
    $lineItems: [AppSubscriptionLineItemInput!]!
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      trialDays: $trialDays
      test: $test
      replacementBehavior: APPLY_IMMEDIATELY
      lineItems: $lineItems
    ) {
      confirmationUrl
      appSubscription {
        id
        name
        status
        trialDays
        createdAt
        currentPeriodEnd
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CANCEL_APP_SUBSCRIPTION = `#graphql
  mutation CancelVnCodGuardSubscription($id: ID!) {
    appSubscriptionCancel(id: $id, prorate: true) {
      appSubscription { id status }
      userErrors { field message }
    }
  }
`;
