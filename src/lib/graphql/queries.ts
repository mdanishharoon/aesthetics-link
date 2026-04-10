// WPGraphQL + WooGraphQL queries for product data.
//
// Prerequisites:
//   - WPGraphQL plugin installed and activated
//   - WooGraphQL (WooCommerce extension for WPGraphQL) installed and activated
//   - WORDPRESS_GRAPHQL_URL env variable pointing to your /graphql endpoint
//
// Optional:
//   - If your store does not use WooCommerce Brands (or the plugin is not
//     registered with WPGraphQL), remove the `productBrands` field from both
//     queries below to avoid schema errors.

export const GET_PRODUCT_BY_SLUG = `
  query GetProductBySlug($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      ... on Product {
        databaseId
        slug
        name
        type
        description
        shortDescription
        image { sourceUrl altText }
        galleryImages(first: 3) { nodes { sourceUrl altText } }
        productCategories(first: 5) { nodes { name slug } }
      }
      ... on SimpleProduct {
        price
        regularPrice
        salePrice
        stockStatus
      }
      ... on VariableProduct {
        price
        regularPrice
        salePrice
        stockStatus
        attributes { nodes { name label options variation } }
        defaultAttributes { nodes { name value } }
        variations(first: 100) {
          nodes {
            databaseId
            stockStatus
            price
            regularPrice
            salePrice
            attributes { nodes { name value label } }
          }
        }
      }
    }
  }
`;

export const GET_CATALOG_PRODUCTS = `
  query GetCatalogProducts($first: Int!) {
    products(first: $first) {
      nodes {
        ... on Product {
          databaseId
          slug
          name
          type
          shortDescription
          image { sourceUrl altText }
          productCategories(first: 3) { nodes { name slug } }
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
          stockStatus
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          stockStatus
        }
      }
    }
  }
`;
