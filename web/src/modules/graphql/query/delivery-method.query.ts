export const DELIVERY_METHODS = `#graphql
  query DeliveryMethods {
    deliveryProfiles(first: 10) {
      nodes {
        profileLocationGroups {
          locationGroupZones(first: 50) {
            nodes {
              methodDefinitions(first: 50) {
                nodes {
                  id
                  name
                  active
                }
              }
            }
          }
        }
      }
    }
  }
`;
