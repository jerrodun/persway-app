/**
 * Persway.io Metafield Operations Library
 * 
 * Provides CRUD operations for customer behavior data and shop configuration metafields.
 * Implements rate limiting, error handling, and data validation according to DATA_MODELS.md
 */

import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { getShopId, validateMetafieldSize } from "./metafield-definitions";

// Type definitions based on DATA_MODELS.md
export interface CustomerBehaviorData {
  version: string;
  audience_assignment: {
    current_audience_id: string | null;
    assigned_at: string | null;
    priority: number | null;
    evaluation_count: number;
  };
  event_summary: {
    cart_viewed: {
      count: number;
      last_at: string | null;
      avg_cart_value: number;
    };
    checkout_started: {
      count: number;
      last_at: string | null;
      conversion_rate: number;
    };
    checkout_completed: {
      count: number;
      last_at: string | null;
      total_value: number;
    };
    product_viewed: {
      count: number;
      categories: Record<string, number>;
      last_at: string | null;
    };
    collection_viewed: {
      count: number;
      collections: string[];
      last_at: string | null;
    };
    search_submitted: {
      count: number;
      terms: string[];
      last_at: string | null;
    };
  };
  affinity_scores: Record<string, number>;
  recent_events: Array<{
    type: string;
    timestamp: string;
    [key: string]: any;
  }>;
  session_data: {
    total_sessions: number;
    avg_session_duration: number;
    last_session: string | null;
    device_types: string[];
  };
  data_retention: {
    created_at: string;
    last_updated: string;
    expires_at: string;
  };
}


export interface ShopAudiences {
  version: string;
  audiences: Array<{
    id: string;
    name: string;
    description: string;
    priority: number;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
    rules: {
      type: 'and' | 'or';
      conditions: Array<{
        event_type: string;
        filter?: string;
        operator: string;
        value: string;
        count_threshold: number;
        timeframe_days: number;
      }>;
    };
    performance_metrics: {
      customer_count: number;
      last_evaluated: string;
      avg_assignment_time_ms: number;
    };
  }>;
  global_settings: {
    evaluation_frequency: 'real_time' | 'hourly' | 'daily';
    max_recent_events: number;
    data_retention_days: number;
    privacy_mode: 'strict' | 'standard';
    performance_monitoring: boolean;
  };
  statistics: {
    total_audiences: number;
    active_audiences: number;
    total_customers_assigned: number;
    last_global_evaluation: string | null;
  };
}

export interface ShopThemeBlocks {
  version: string;
  hero_banners: Record<string, {
    image_url: string;
    image_alt: string;
    heading: string;
    subheading: string;
    button_text: string;
    button_url: string;
    background_color: string;
  }>;
  block_settings: {
    fallback_strategy: 'default' | 'random' | 'latest';
    cache_duration_seconds: number;
    performance_monitoring: boolean;
  };
}

// GraphQL queries and mutations
const GET_CUSTOMER_METAFIELD = `
  query getCustomerMetafield($customerId: ID!, $namespace: String!, $key: String!) {
    customer(id: $customerId) {
      id
      metafield(namespace: $namespace, key: $key) {
        id
        value
        updatedAt
      }
    }
  }
`;

const UPDATE_CUSTOMER_METAFIELD = `
  mutation updateCustomerMetafield($customerId: ID!, $metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
        updatedAt
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const GET_SHOP_METAFIELD = `
  query getShopMetafield($namespace: String!, $key: String!) {
    shop {
      id
      metafield(namespace: $namespace, key: $key) {
        id
        value
        updatedAt
      }
    }
  }
`;

const UPDATE_SHOP_METAFIELD = `
  mutation updateShopMetafield($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
        updatedAt
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

// Error classes
export class MetafieldError extends Error {
  constructor(message: string, public code?: string, public field?: string) {
    super(message);
    this.name = 'MetafieldError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Rate limiting helper
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number = 40; // Conservative limit for GraphQL API
  private readonly timeWindow: number = 60000; // 1 minute

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  getWaitTime(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, this.timeWindow - (Date.now() - oldestRequest));
  }
}

const rateLimiter = new RateLimiter();

// Helper function to handle GraphQL requests with rate limiting
async function executeGraphQL<T>(
  admin: AdminApiContext,
  query: string,
  variables: Record<string, any>
): Promise<T> {
  if (!rateLimiter.canMakeRequest()) {
    const waitTime = rateLimiter.getWaitTime();
    throw new RateLimitError(`Rate limit exceeded. Retry after ${waitTime}ms`, waitTime);
  }

  try {
    rateLimiter.recordRequest();
    const response = await admin.graphql(query, { variables });
    const data = await response.json();

    if (data.errors) {
      throw new MetafieldError(`GraphQL error: ${data.errors[0].message}`);
    }

    if (data.data?.metafieldsSet?.userErrors?.length > 0) {
      const error = data.data.metafieldsSet.userErrors[0];
      throw new MetafieldError(error.message, error.code, error.field);
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof MetafieldError || error instanceof RateLimitError) {
      throw error;
    }
    throw new MetafieldError(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Customer metafield operations
export async function getCustomerBehaviorData(
  admin: AdminApiContext,
  customerId: string
): Promise<CustomerBehaviorData | null> {
  try {
    const result = await executeGraphQL<{ customer: { metafield: { value: string } | null } }>(
      admin,
      GET_CUSTOMER_METAFIELD,
      {
        customerId: `gid://shopify/Customer/${customerId}`,
        namespace: '$app:persway_events',
        key: 'behavior_data'
      }
    );

    if (!result.customer?.metafield?.value) {
      return null;
    }

    return JSON.parse(result.customer.metafield.value) as CustomerBehaviorData;
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    throw new MetafieldError(`Failed to get customer behavior data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateCustomerBehaviorData(
  admin: AdminApiContext,
  customerId: string,
  data: CustomerBehaviorData
): Promise<void> {
  try {
    // Validate data size (target ~200KB)
    validateMetafieldSize(data, 200, 'Customer behavior data');

    // Update timestamp
    data.data_retention.last_updated = new Date().toISOString();

    await executeGraphQL(
      admin,
      UPDATE_CUSTOMER_METAFIELD,
      {
        customerId: `gid://shopify/Customer/${customerId}`,
        metafields: [{
          ownerId: `gid://shopify/Customer/${customerId}`,
          namespace: '$app:persway_events',
          key: 'behavior_data',
          value: JSON.stringify(data),
          type: 'json'
        }]
      }
    );
  } catch (error) {
    if (error instanceof MetafieldError || error instanceof RateLimitError) throw error;
    throw new MetafieldError(`Failed to update customer behavior data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


// Shop metafield operations (using app-owned shop metafields for configuration)
export async function getShopAudiences(admin: AdminApiContext): Promise<ShopAudiences | null> {
  try {
    const result = await executeGraphQL<{ shop: { id: string; metafield: { value: string } | null } }>(
      admin,
      GET_SHOP_METAFIELD,
      {
        namespace: '$app:persway_config',
        key: 'audiences'
      }
    );

    if (!result.shop?.metafield?.value) {
      return null;
    }

    return JSON.parse(result.shop.metafield.value) as ShopAudiences;
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    throw new MetafieldError(`Failed to get shop audiences: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateShopAudiences(
  admin: AdminApiContext,
  data: ShopAudiences
): Promise<void> {
  try {
    // Validate data size (target ~500KB)
    validateMetafieldSize(data, 500, 'Shop audiences data');

    // Get shop ID
    const shopId = await getShopId(admin);

    await executeGraphQL(
      admin,
      UPDATE_SHOP_METAFIELD,
      {
        metafields: [{
          ownerId: shopId,
          namespace: '$app:persway_config',
          key: 'audiences',
          value: JSON.stringify(data),
          type: 'json'
        }]
      }
    );
  } catch (error) {
    if (error instanceof MetafieldError || error instanceof RateLimitError) throw error;
    throw new MetafieldError(`Failed to update shop audiences: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getShopThemeBlocks(admin: AdminApiContext): Promise<ShopThemeBlocks | null> {
  try {
    const result = await executeGraphQL<{ shop: { id: string; metafield: { value: string } | null } }>(
      admin,
      GET_SHOP_METAFIELD,
      {
        namespace: '$app:persway_config',
        key: 'theme_blocks'
      }
    );

    if (!result.shop?.metafield?.value) {
      return null;
    }

    return JSON.parse(result.shop.metafield.value) as ShopThemeBlocks;
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    throw new MetafieldError(`Failed to get shop theme blocks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateShopThemeBlocks(
  admin: AdminApiContext,
  data: ShopThemeBlocks
): Promise<void> {
  try {
    // Validate data size (target ~250KB)
    validateMetafieldSize(data, 250, 'Shop theme blocks data');

    // Get shop ID
    const shopId = await getShopId(admin);

    await executeGraphQL(
      admin,
      UPDATE_SHOP_METAFIELD,
      {
        metafields: [{
          ownerId: shopId,
          namespace: '$app:persway_config',
          key: 'theme_blocks',
          value: JSON.stringify(data),
          type: 'json'
        }]
      }
    );
  } catch (error) {
    if (error instanceof MetafieldError || error instanceof RateLimitError) throw error;
    throw new MetafieldError(`Failed to update shop theme blocks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper functions for creating default data structures
export function createDefaultCustomerBehaviorData(): CustomerBehaviorData {
  const now = new Date().toISOString();
  return {
    version: "1.0",
    audience_assignment: {
      current_audience_id: null,
      assigned_at: null,
      priority: null,
      evaluation_count: 0
    },
    event_summary: {
      cart_viewed: { count: 0, last_at: null, avg_cart_value: 0 },
      checkout_started: { count: 0, last_at: null, conversion_rate: 0 },
      checkout_completed: { count: 0, last_at: null, total_value: 0 },
      product_viewed: { count: 0, categories: {}, last_at: null },
      collection_viewed: { count: 0, collections: [], last_at: null },
      search_submitted: { count: 0, terms: [], last_at: null }
    },
    affinity_scores: {},
    recent_events: [],
    session_data: {
      total_sessions: 0,
      avg_session_duration: 0,
      last_session: null,
      device_types: []
    },
    data_retention: {
      created_at: now,
      last_updated: now,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
    }
  };
}

export function createDefaultShopAudiences(): ShopAudiences {
  return {
    version: "1.0",
    audiences: [],
    global_settings: {
      evaluation_frequency: "real_time",
      max_recent_events: 50,
      data_retention_days: 365,
      privacy_mode: "strict",
      performance_monitoring: true
    },
    statistics: {
      total_audiences: 0,
      active_audiences: 0,
      total_customers_assigned: 0,
      last_global_evaluation: null
    }
  };
}

export function createDefaultShopThemeBlocks(): ShopThemeBlocks {
  return {
    version: "1.0",
    hero_banners: {
      default: {
        image_url: "",
        image_alt: "Welcome to our store",
        heading: "Welcome to Our Store",
        subheading: "Discover amazing products tailored just for you",
        button_text: "Shop Now",
        button_url: "/collections/all",
        background_color: "#f8f9fa"
      }
    },
    block_settings: {
      fallback_strategy: "default",
      cache_duration_seconds: 300,
      performance_monitoring: true
    }
  };
}