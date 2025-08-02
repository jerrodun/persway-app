/**
 * Sample data for testing Persway.io metafield operations
 * Provides realistic test data that matches DATA_MODELS.md specifications
 */

import type { 
  CustomerBehaviorData, 
  SessionMigrationData, 
  ShopAudiences, 
  ShopThemeBlocks 
} from './metafields';

// Sample customer behavior data for testing
export const sampleCustomerBehaviorData: CustomerBehaviorData = {
  version: "1.0",
  audience_assignment: {
    current_audience_id: "cat_lovers_001",
    assigned_at: "2025-01-15T10:30:00Z",
    priority: 1,
    evaluation_count: 3
  },
  event_summary: {
    cart_viewed: {
      count: 5,
      last_at: "2025-01-15T09:45:00Z",
      avg_cart_value: 45.99
    },
    checkout_started: {
      count: 2,
      last_at: "2025-01-15T08:30:00Z",
      conversion_rate: 0.4
    },
    checkout_completed: {
      count: 1,
      last_at: "2025-01-10T14:20:00Z",
      total_value: 67.99
    },
    product_viewed: {
      count: 12,
      categories: {
        "cats": 8,
        "dogs": 2,
        "fish": 2
      },
      last_at: "2025-01-15T09:30:00Z"
    },
    collection_viewed: {
      count: 6,
      collections: ["cats", "toys", "food"],
      last_at: "2025-01-15T09:25:00Z"
    },
    search_submitted: {
      count: 3,
      terms: ["cat toy", "scratching post"],
      last_at: "2025-01-15T09:15:00Z"
    }
  },
  affinity_scores: {
    "cat_lover": 0.85,
    "dog_owner": 0.15,
    "fish_enthusiast": 0.05
  },
  recent_events: [
    {
      type: "product_viewed",
      timestamp: "2025-01-15T09:30:00Z",
      product_id: "gid://shopify/Product/123",
      category: "cats",
      price: 24.99
    },
    {
      type: "cart_viewed",
      timestamp: "2025-01-15T09:45:00Z",
      cart_value: 45.99,
      item_count: 2
    },
    {
      type: "collection_viewed",
      timestamp: "2025-01-15T09:25:00Z",
      collection_id: "gid://shopify/Collection/456",
      collection_handle: "cats"
    }
  ],
  session_data: {
    total_sessions: 8,
    avg_session_duration: 420,
    last_session: "2025-01-15T09:00:00Z",
    device_types: ["desktop", "mobile"]
  },
  data_retention: {
    created_at: "2024-12-01T10:00:00Z",
    last_updated: "2025-01-15T10:30:00Z",
    expires_at: "2025-12-01T10:00:00Z"
  }
};

// Sample session migration data
export const sampleSessionMigrationData: SessionMigrationData = {
  version: "1.0",
  migrations: [
    {
      persway_id: "anon_xyz789",
      migrated_at: "2025-01-15T10:30:00Z",
      session_start: "2025-01-15T09:00:00Z",
      events_count: 8,
      pre_auth_summary: {
        pages_viewed: 5,
        products_viewed: 3,
        time_spent: 1200,
        categories_browsed: ["cats", "toys"]
      }
    }
  ],
  migration_stats: {
    total_migrations: 1,
    last_migration: "2025-01-15T10:30:00Z"
  }
};

// Sample shop audiences configuration
export const sampleShopAudiences: ShopAudiences = {
  version: "1.0",
  audiences: [
    {
      id: "cat_lovers_001",
      name: "Cat Lovers",
      description: "Customers who frequently view cat products",
      priority: 1,
      status: "active",
      created_at: "2025-01-10T14:00:00Z",
      updated_at: "2025-01-15T10:00:00Z",
      rules: {
        type: "and",
        conditions: [
          {
            event_type: "product_viewed",
            filter: "category",
            operator: "contains",
            value: "cats",
            count_threshold: 3,
            timeframe_days: 30
          },
          {
            event_type: "cart_viewed",
            operator: "count_gte",
            value: "1",
            count_threshold: 1,
            timeframe_days: 7
          }
        ]
      },
      performance_metrics: {
        customer_count: 47,
        last_evaluated: "2025-01-15T10:00:00Z",
        avg_assignment_time_ms: 45
      }
    },
    {
      id: "dog_owners_002",
      name: "Dog Owners",
      description: "Customers who purchase dog products",
      priority: 2,
      status: "active",
      created_at: "2025-01-08T16:00:00Z",
      updated_at: "2025-01-12T11:00:00Z",
      rules: {
        type: "or",
        conditions: [
          {
            event_type: "checkout_completed",
            filter: "product_category",
            operator: "contains",
            value: "dogs",
            count_threshold: 1,
            timeframe_days: 90
          },
          {
            event_type: "search_submitted",
            filter: "search_term",
            operator: "contains",
            value: "dog",
            count_threshold: 2,
            timeframe_days: 30
          }
        ]
      },
      performance_metrics: {
        customer_count: 23,
        last_evaluated: "2025-01-15T10:00:00Z",
        avg_assignment_time_ms: 38
      }
    },
    {
      id: "high_value_003",
      name: "High Value Customers",
      description: "Customers with total purchase value over $200",
      priority: 3,
      status: "active",
      created_at: "2025-01-05T12:00:00Z",
      updated_at: "2025-01-14T15:30:00Z",
      rules: {
        type: "and",
        conditions: [
          {
            event_type: "checkout_completed",
            filter: "total_value",
            operator: "sum_gte",
            value: "200",
            count_threshold: 1,
            timeframe_days: 365
          }
        ]
      },
      performance_metrics: {
        customer_count: 15,
        last_evaluated: "2025-01-15T10:00:00Z",
        avg_assignment_time_ms: 52
      }
    }
  ],
  global_settings: {
    evaluation_frequency: "real_time",
    max_recent_events: 50,
    data_retention_days: 365,
    privacy_mode: "strict",
    performance_monitoring: true
  },
  statistics: {
    total_audiences: 3,
    active_audiences: 3,
    total_customers_assigned: 85,
    last_global_evaluation: "2025-01-15T10:00:00Z"
  }
};

// Sample shop theme blocks configuration
export const sampleShopThemeBlocks: ShopThemeBlocks = {
  version: "1.0",
  hero_banners: {
    default: {
      image_url: "https://cdn.shopify.com/s/files/default-hero.jpg",
      image_alt: "Welcome to Our Pet Store",
      heading: "Everything for Your Beloved Pets",
      subheading: "Quality products for all your pet needs",
      button_text: "Shop Now",
      button_url: "/collections/all",
      background_color: "#f8f9fa"
    },
    cat_lovers_001: {
      image_url: "https://cdn.shopify.com/s/files/cat-hero.jpg",
      image_alt: "Cat products and accessories",
      heading: "Perfect Products for Your Feline Friend",
      subheading: "From toys to treats, everything cats love",
      button_text: "Shop Cat Products",
      button_url: "/collections/cats",
      background_color: "#fff3cd"
    },
    dog_owners_002: {
      image_url: "https://cdn.shopify.com/s/files/dog-hero.jpg",
      image_alt: "Dog products and accessories",
      heading: "Your Dog Deserves the Best",
      subheading: "Premium products for happy, healthy dogs",
      button_text: "Shop Dog Products",
      button_url: "/collections/dogs",
      background_color: "#d4edda"
    },
    high_value_003: {
      image_url: "https://cdn.shopify.com/s/files/vip-hero.jpg",
      image_alt: "Premium pet products for valued customers",
      heading: "Exclusive Products for Our VIP Customers",
      subheading: "Premium selections with special member pricing",
      button_text: "Shop VIP Collection",
      button_url: "/collections/premium",
      background_color: "#e2e3f0"
    }
  },
  block_settings: {
    fallback_strategy: "default",
    cache_duration_seconds: 300,
    performance_monitoring: true
  }
};

// Test scenarios for different customer types
export const testScenarios = {
  // New customer with no data
  newCustomer: {
    name: "New Customer",
    customerId: "new_customer_001",
    expectedBehaviorData: null,
    expectedMigrationData: null
  },

  // Cat lover customer
  catLover: {
    name: "Cat Lover Customer", 
    customerId: "cat_lover_001",
    expectedBehaviorData: sampleCustomerBehaviorData,
    expectedMigrationData: sampleSessionMigrationData
  },

  // Dog owner customer
  dogOwner: {
    name: "Dog Owner Customer",
    customerId: "dog_owner_001", 
    expectedBehaviorData: {
      ...sampleCustomerBehaviorData,
      audience_assignment: {
        current_audience_id: "dog_owners_002",
        assigned_at: "2025-01-14T15:20:00Z",
        priority: 2,
        evaluation_count: 2
      },
      event_summary: {
        ...sampleCustomerBehaviorData.event_summary,
        product_viewed: {
          count: 8,
          categories: {
            "dogs": 6,
            "cats": 1,
            "toys": 1
          },
          last_at: "2025-01-14T16:30:00Z"
        },
        search_submitted: {
          count: 4,
          terms: ["dog food", "dog toys", "leash"],
          last_at: "2025-01-14T16:15:00Z"
        }
      },
      affinity_scores: {
        "dog_owner": 0.90,
        "cat_lover": 0.05,
        "high_value": 0.25
      }
    },
    expectedMigrationData: null
  },

  // High value customer
  highValue: {
    name: "High Value Customer",
    customerId: "high_value_001",
    expectedBehaviorData: {
      ...sampleCustomerBehaviorData,
      audience_assignment: {
        current_audience_id: "high_value_003",
        assigned_at: "2025-01-12T09:45:00Z",
        priority: 3,
        evaluation_count: 1
      },
      event_summary: {
        ...sampleCustomerBehaviorData.event_summary,
        checkout_completed: {
          count: 3,
          last_at: "2025-01-14T18:30:00Z",
          total_value: 347.85
        }
      },
      affinity_scores: {
        "high_value": 0.95,
        "cat_lover": 0.60,
        "dog_owner": 0.30
      }
    },
    expectedMigrationData: null
  }
};

// Helper function to get sample data by scenario
export function getSampleDataByScenario(scenarioName: keyof typeof testScenarios) {
  return testScenarios[scenarioName];
}

// Helper function to create minimal test data
export function createMinimalTestData() {
  return {
    behaviorData: {
      version: "1.0",
      audience_assignment: {
        current_audience_id: null,
        assigned_at: null,
        priority: null,
        evaluation_count: 0
      },
      event_summary: {
        cart_viewed: { count: 1, last_at: new Date().toISOString(), avg_cart_value: 25.99 },
        checkout_started: { count: 0, last_at: null, conversion_rate: 0 },
        checkout_completed: { count: 0, last_at: null, total_value: 0 },
        product_viewed: { count: 2, categories: { "test": 2 }, last_at: new Date().toISOString() },
        collection_viewed: { count: 1, collections: ["test"], last_at: new Date().toISOString() },
        search_submitted: { count: 0, terms: [], last_at: null }
      },
      affinity_scores: {},
      recent_events: [
        {
          type: "product_viewed",
          timestamp: new Date().toISOString(),
          product_id: "gid://shopify/Product/test",
          category: "test"
        }
      ],
      session_data: {
        total_sessions: 1,
        avg_session_duration: 300,
        last_session: new Date().toISOString(),
        device_types: ["desktop"]
      },
      data_retention: {
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    } as CustomerBehaviorData,

    audiences: {
      version: "1.0",
      audiences: [
        {
          id: "test_audience_001",
          name: "Test Audience",
          description: "Test audience for development",
          priority: 1,
          status: "active" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          rules: {
            type: "and" as const,
            conditions: [
              {
                event_type: "product_viewed",
                filter: "category",
                operator: "contains",
                value: "test",
                count_threshold: 1,
                timeframe_days: 30
              }
            ]
          },
          performance_metrics: {
            customer_count: 1,
            last_evaluated: new Date().toISOString(),
            avg_assignment_time_ms: 25
          }
        }
      ],
      global_settings: {
        evaluation_frequency: "real_time" as const,
        max_recent_events: 50,
        data_retention_days: 365,
        privacy_mode: "strict" as const,
        performance_monitoring: true
      },
      statistics: {
        total_audiences: 1,
        active_audiences: 1,
        total_customers_assigned: 1,
        last_global_evaluation: new Date().toISOString()
      }
    } as ShopAudiences
  };
}