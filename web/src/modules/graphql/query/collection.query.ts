export const COD_COLLECTIONS = `#graphql
  query CodCollections($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Collection {
        id
        title
        image {
          url
          altText
        }
      }
    }
  }
`;
