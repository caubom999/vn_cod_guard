export const PAYMENT_GATEWAYS = `#graphql
  query PaymentGateways {
    translatableResources(first: 100, resourceType: PAYMENT_GATEWAY) {
      nodes {
        resourceId
        translatableContent {
          key
          value
        }
      }
    }
  }
`;
