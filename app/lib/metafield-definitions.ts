/**
 * Metafield Definitions - Single Source of Truth
 * 
 * All metafield definitions for the Persway app are centralized here
 * to prevent duplication and ensure consistency across the application.
 */

import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

export interface MetafieldDefinition {
  name: string;
  namespace: string;
  key: string;
  description: string;
  type: string;
  ownerType: "CUSTOMER" | "SHOP";
  access?: {
    admin: "MERCHANT_READ" | "MERCHANT_READ_WRITE";
    storefront: "NONE" | "PUBLIC_READ";
  };
}

export const CUSTOMER_METAFIELD_DEFINITIONS: MetafieldDefinition[] = [
  {
    name: "Customer Behavior Data",
    namespace: "$app:persway_events", 
    key: "behavior_data",
    description: "Customer behavioral events and audience assignment data for personalization",
    type: "json",
    ownerType: "CUSTOMER",
    access: {
      admin: "MERCHANT_READ",
      storefront: "NONE"
    }
  }
];

export const SHOP_METAFIELD_DEFINITIONS: MetafieldDefinition[] = [
  {
    name: "Audience Configuration",
    namespace: "$app:persway_config",
    key: "audiences",
    description: "Audience definitions and rules for customer personalization",
    type: "json",
    ownerType: "SHOP",
    access: {
      admin: "MERCHANT_READ",
      storefront: "NONE"
    }
  },
  {
    name: "Theme Block Configuration", 
    namespace: "$app:persway_config",
    key: "theme_blocks",
    description: "Personalized content configurations for theme app extensions",
    type: "json",
    ownerType: "SHOP",
    access: {
      admin: "MERCHANT_READ",
      storefront: "NONE"  
    }
  }
];

export const ALL_METAFIELD_DEFINITIONS: MetafieldDefinition[] = [
  ...CUSTOMER_METAFIELD_DEFINITIONS,
  ...SHOP_METAFIELD_DEFINITIONS
];

const CREATE_METAFIELD_DEFINITION_MUTATION = `
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        name
        namespace
        key
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const GET_SHOP_ID_QUERY = `
  query GetShopId {
    shop {
      id
    }
  }
`;

/**
 * Shared utility to get shop ID
 */
export async function getShopId(admin: AdminApiContext): Promise<string> {
  const response = await admin.graphql(GET_SHOP_ID_QUERY);
  const data = await response.json();
  return data.data.shop.id;
}

/**
 * Create a single metafield definition
 */
export async function createMetafieldDefinition(
  admin: AdminApiContext, 
  definition: MetafieldDefinition
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await admin.graphql(CREATE_METAFIELD_DEFINITION_MUTATION, {
      variables: {
        definition: {
          name: definition.name,
          namespace: definition.namespace,
          key: definition.key,
          description: definition.description,
          type: definition.type,
          ownerType: definition.ownerType,
          access: definition.access
        }
      }
    });

    const data = await response.json();
    
    if (data.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
      const errors = data.data.metafieldDefinitionCreate.userErrors;
      // Check if it's just an "already exists" error, which is fine
      const criticalErrors = errors.filter((error: any) => 
        !error.message.includes('already exists') && 
        !error.message.includes('already taken') &&
        !error.message.includes('Key is in use')
      );
      
      if (criticalErrors.length > 0) {
        return { success: false, error: criticalErrors[0].message };
      }
      
      // If all errors were "already exists" type, treat as success
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Create all metafield definitions for the app
 */
export async function createAllMetafieldDefinitions(admin: AdminApiContext): Promise<{
  success: boolean;
  results: Array<{ definition: string; success: boolean; error?: string }>;
}> {
  const results: Array<{ definition: string; success: boolean; error?: string }> = [];
  
  for (const definition of ALL_METAFIELD_DEFINITIONS) {
    const result = await createMetafieldDefinition(admin, definition);
    results.push({
      definition: `${definition.namespace}.${definition.key}`,
      success: result.success,
      error: result.error
    });
  }

  const allSuccessful = results.every(r => r.success);
  
  return {
    success: allSuccessful,
    results
  };
}

/**
 * Validate metafield data size
 */
export function validateMetafieldSize(data: any, maxSizeKB: number, fieldName: string): void {
  const jsonString = JSON.stringify(data);
  const maxSizeBytes = maxSizeKB * 1024;
  
  if (jsonString.length > maxSizeBytes) {
    throw new Error(`${fieldName} exceeds recommended size limit (~${maxSizeKB}KB)`);
  }
}