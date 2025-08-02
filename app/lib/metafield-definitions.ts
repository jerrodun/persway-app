/**
 * GraphQL mutations and queries for creating Shopify metafield definitions
 * Required for Persway.io customer behavior tracking and audience management
 */

// Mutation to create a metafield definition
export const CREATE_METAFIELD_DEFINITION = `
  mutation createMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        namespace
        key
        name
        description
        type {
          name
        }
        ownerType
        validations {
          name
          value
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

// Query to check if metafield definition already exists
export const GET_METAFIELD_DEFINITIONS = `
  query getMetafieldDefinitions($namespace: String!, $ownerType: MetafieldOwnerType!) {
    metafieldDefinitions(
      first: 10
      namespace: $namespace
      ownerType: $ownerType
    ) {
      edges {
        node {
          id
          namespace
          key
          name
          description
          type {
            name
          }
          ownerType
        }
      }
    }
  }
`;

// Customer metafield definitions according to DATA_MODELS.md
export const CUSTOMER_METAFIELD_DEFINITIONS = [
  {
    namespace: "$app:persway_events",
    key: "behavior_data",
    name: "Customer Behavior Data",
    description: "Stores customer behavioral events, audience assignment, and affinity scores for personalization (target ~200KB)",
    type: "json",
    ownerType: "CUSTOMER" as const,
    validations: []
  },
  {
    namespace: "$app:persway_session",
    key: "migration_data", 
    name: "Session Migration Data",
    description: "Tracks data migrated from anonymous sessions when customer logs in (target ~50KB)",
    type: "json",
    ownerType: "CUSTOMER" as const,
    validations: []
  }
];

// Shop metafield definitions according to DATA_MODELS.md
export const SHOP_METAFIELD_DEFINITIONS = [
  {
    namespace: "$app:persway_config",
    key: "audiences",
    name: "Audience Definitions",
    description: "Stores all audience definitions, rules, and performance metrics for customer segmentation (target ~500KB)",
    type: "json",
    ownerType: "SHOP" as const,
    validations: []
  },
  {
    namespace: "$app:persway_config", 
    key: "theme_blocks",
    name: "Theme Block Configurations",
    description: "Stores personalized content configurations for each audience (hero banners, etc.) (target ~250KB)",
    type: "json",
    ownerType: "SHOP" as const,
    validations: []
  }
];

// All metafield definitions combined
export const ALL_METAFIELD_DEFINITIONS = [
  ...CUSTOMER_METAFIELD_DEFINITIONS,
  ...SHOP_METAFIELD_DEFINITIONS
];

// Helper function to format metafield definition for GraphQL
export function formatMetafieldDefinitionInput(definition: typeof ALL_METAFIELD_DEFINITIONS[0]) {
  const input: any = {
    namespace: definition.namespace,
    key: definition.key,
    name: definition.name,
    description: definition.description,
    type: definition.type,
    ownerType: definition.ownerType
  };

  // Only include validations if there are any
  if (definition.validations.length > 0) {
    input.validations = definition.validations.map(validation => ({
      name: validation.name,
      value: validation.value
    }));
  }

  return input;
}