export const COD_PRODUCTS = `#graphql
  query CodProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        featuredImage {
          url
          altText
        }
      }
    }
  }
`;
