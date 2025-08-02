# Data Models & Storage Strategy

## ⚠️ Critical Notice
**These data structures are foundational to the entire app. Changes after deployment are extremely difficult and may require customer data migration. Review thoroughly before implementation.**

## Overview

Persway uses a hybrid storage approach that seamlessly transitions between anonymous browsing and authenticated customer experiences while respecting Shopify's metafield constraints and GDPR requirements.

### Storage Strategy
- **Anonymous Users**: localStorage for immediate event tracking
- **Authenticated Users**: Customer metafields for persistent, cross-device data
- **App Configuration**: Shop metafields for audience definitions and settings
- **Session Data**: Prisma/SQLite for Shopify authentication only

## Required Shopify Scopes

Update `shopify.app.toml` to include:
```toml
scopes = "write_customers,read_customers,write_customer_metafields,read_customer_metafields,write_shop_metafields,read_shop_metafields,write_products,read_products"
```

## Customer Data Model

### 1. Primary Behavior Data Metafield

**Purpose**: Store customer behavioral events and audience assignment  
**Namespace**: `$app:persway_events`  
**Key**: `behavior_data`  
**Type**: `json`  
**Max Size**: ~100KB (performance optimized)

```json
{
  "version": "1.0",
  "audience_assignment": {
    "current_audience_id": "cat_lovers_001",
    "assigned_at": "2025-01-15T10:30:00Z",
    "priority": 1,
    "evaluation_count": 3
  },
  "event_summary": {
    "cart_viewed": {
      "count": 5,
      "last_at": "2025-01-15T09:45:00Z",
      "avg_cart_value": 45.99
    },
    "checkout_started": {
      "count": 2,
      "last_at": "2025-01-15T08:30:00Z",
      "conversion_rate": 0.4
    },
    "checkout_completed": {
      "count": 1,
      "last_at": "2025-01-10T14:20:00Z",
      "total_value": 67.99
    },
    "product_viewed": {
      "count": 12,
      "categories": {
        "cats": 8,
        "dogs": 2,
        "fish": 2
      },
      "last_at": "2025-01-15T09:30:00Z"
    },
    "collection_viewed": {
      "count": 6,
      "collections": ["cats", "toys", "food"],
      "last_at": "2025-01-15T09:25:00Z"
    },
    "search_submitted": {
      "count": 3,
      "terms": ["cat toy", "scratching post"],
      "last_at": "2025-01-15T09:15:00Z"
    }
  },
  "affinity_scores": {
    "cat_lover": 0.85,
    "dog_owner": 0.15,
    "fish_enthusiast": 0.05
  },
  "recent_events": [
    {
      "type": "product_viewed",
      "timestamp": "2025-01-15T09:30:00Z",
      "product_id": "gid://shopify/Product/123",
      "category": "cats",
      "price": 24.99
    },
    {
      "type": "cart_viewed",
      "timestamp": "2025-01-15T09:45:00Z",
      "cart_value": 45.99,
      "item_count": 2
    }
  ],
  "session_data": {
    "total_sessions": 8,
    "avg_session_duration": 420,
    "last_session": "2025-01-15T09:00:00Z",
    "device_types": ["desktop", "mobile"]
  },
  "data_retention": {
    "created_at": "2024-12-01T10:00:00Z",
    "last_updated": "2025-01-15T10:30:00Z",
    "expires_at": "2025-12-01T10:00:00Z"
  }
}
```

### 2. Anonymous Session Migration Metafield

**Purpose**: Track data migrated from anonymous sessions  
**Namespace**: `$app:persway_session`  
**Key**: `migration_data`  
**Type**: `json`

```json
{
  "version": "1.0",
  "migrations": [
    {
      "persway_id": "anon_xyz789",
      "migrated_at": "2025-01-15T10:30:00Z",
      "session_start": "2025-01-15T09:00:00Z",
      "events_count": 8,
      "pre_auth_summary": {
        "pages_viewed": 5,
        "products_viewed": 3,
        "time_spent": 1200,
        "categories_browsed": ["cats", "toys"]
      }
    }
  ],
  "migration_stats": {
    "total_migrations": 1,
    "last_migration": "2025-01-15T10:30:00Z"
  }
}
```

## Shop Configuration Model

### 1. Audience Definitions Metafield

**Purpose**: Store all audience definitions and rules  
**Namespace**: `$app:persway_config`  
**Key**: `audiences`  
**Type**: `json`  
**Max Size**: ~500KB (supports hundreds of audiences)

```json
{
  "version": "1.0",
  "audiences": [
    {
      "id": "cat_lovers_001",
      "name": "Cat Lovers",
      "description": "Customers who frequently view cat products",
      "priority": 1,
      "status": "active",
      "created_at": "2025-01-10T14:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z",
      "rules": {
        "type": "and",
        "conditions": [
          {
            "event_type": "product_viewed",
            "filter": "category",
            "operator": "contains",
            "value": "cats",
            "count_threshold": 3,
            "timeframe_days": 30
          },
          {
            "event_type": "cart_viewed",
            "count_threshold": 1,
            "timeframe_days": 7
          }
        ]
      },
      "performance_metrics": {
        "customer_count": 47,
        "last_evaluated": "2025-01-15T10:00:00Z",
        "avg_assignment_time_ms": 45
      }
    },
    {
      "id": "dog_owners_002",
      "name": "Dog Owners",
      "description": "Customers who purchase dog products",
      "priority": 2,
      "status": "active",
      "created_at": "2025-01-08T16:00:00Z",
      "updated_at": "2025-01-12T11:00:00Z",
      "rules": {
        "type": "or",
        "conditions": [
          {
            "event_type": "checkout_completed",
            "filter": "product_category",
            "operator": "contains",
            "value": "dogs",
            "count_threshold": 1,
            "timeframe_days": 90
          },
          {
            "event_type": "search_submitted",
            "filter": "search_term",
            "operator": "contains",
            "value": "dog",
            "count_threshold": 2,
            "timeframe_days": 30
          }
        ]
      },
      "performance_metrics": {
        "customer_count": 23,
        "last_evaluated": "2025-01-15T10:00:00Z",
        "avg_assignment_time_ms": 38
      }
    }
  ],
  "global_settings": {
    "evaluation_frequency": "real_time",
    "max_recent_events": 50,
    "data_retention_days": 365,
    "privacy_mode": "strict",
    "performance_monitoring": true
  },
  "statistics": {
    "total_audiences": 2,
    "active_audiences": 2,
    "total_customers_assigned": 70,
    "last_global_evaluation": "2025-01-15T10:00:00Z"
  }
}
```

### 2. Theme Block Configurations Metafield

**Purpose**: Store personalized content for each audience  
**Namespace**: `$app:persway_config`  
**Key**: `theme_blocks`  
**Type**: `json`

```json
{
  "version": "1.0",
  "hero_banners": {
    "default": {
      "image_url": "https://cdn.shopify.com/s/files/default-hero.jpg",
      "image_alt": "Welcome to Our Pet Store",
      "heading": "Everything for Your Beloved Pets",
      "subheading": "Quality products for all your pet needs",
      "button_text": "Shop Now",
      "button_url": "/collections/all",
      "background_color": "#f8f9fa"
    },
    "cat_lovers_001": {
      "image_url": "https://cdn.shopify.com/s/files/cat-hero.jpg",
      "image_alt": "Cat products and accessories",
      "heading": "Perfect Products for Your Feline Friend",
      "subheading": "From toys to treats, everything cats love",
      "button_text": "Shop Cat Products",
      "button_url": "/collections/cats",
      "background_color": "#fff3cd"
    },
    "dog_owners_002": {
      "image_url": "https://cdn.shopify.com/s/files/dog-hero.jpg", 
      "image_alt": "Dog products and accessories",
      "heading": "Your Dog Deserves the Best",
      "subheading": "Premium products for happy, healthy dogs",
      "button_text": "Shop Dog Products",
      "button_url": "/collections/dogs",
      "background_color": "#d4edda"
    }
  },
  "block_settings": {
    "fallback_strategy": "default",
    "cache_duration_seconds": 300,
    "performance_monitoring": true
  }
}
```

## localStorage Model (Anonymous Users)

### Event Tracking Structure

**Key**: `persway_data`  
**Purpose**: Track anonymous user behavior before authentication

```json
{
  "version": "1.0",
  "persway_id": "anon_abc123def456",
  "session_start": "2025-01-15T09:00:00Z",
  "last_activity": "2025-01-15T09:45:00Z",
  "events": [
    {
      "id": "evt_001",
      "type": "page_viewed",
      "timestamp": "2025-01-15T09:05:00Z",
      "data": {
        "url": "/collections/cats",
        "title": "Cat Products",
        "referrer": "https://google.com"
      }
    },
    {
      "id": "evt_002", 
      "type": "product_viewed",
      "timestamp": "2025-01-15T09:10:00Z",
      "data": {
        "product_id": "gid://shopify/Product/123",
        "product_title": "Interactive Cat Toy",
        "category": "cats",
        "price": "24.99",
        "currency": "USD"
      }
    },
    {
      "id": "evt_003",
      "type": "cart_viewed", 
      "timestamp": "2025-01-15T09:45:00Z",
      "data": {
        "cart_value": "45.99",
        "item_count": 2,
        "currency": "USD"
      }
    }
  ],
  "provisional_scores": {
    "cat_lover": 0.6,
    "dog_owner": 0.1,
    "fish_enthusiast": 0.0
  },
  "session_metadata": {
    "user_agent": "Mozilla/5.0...",
    "screen_resolution": "1920x1080",
    "timezone": "America/New_York",
    "locale": "en-US"
  }
}
```

## Event Processing Pipeline

### 1. Web Pixel Event Capture

```javascript
// Standard Shopify Web Pixel API events we'll capture
const TRACKED_EVENTS = [
  'cart_viewed',
  'checkout_started', 
  'checkout_completed',
  'collection_viewed',
  'page_viewed',
  'product_added_to_cart',
  'product_removed_from_cart',
  'product_viewed',
  'search_submitted'
];
```

### 2. Event Processing Flow

```
1. Web Pixel captures event
2. Check if customer is authenticated
3a. If authenticated: Process and update customer metafield immediately
3b. If anonymous: Store in localStorage
4. Run audience evaluation logic
5. Update audience assignment if changed
6. Trigger theme personalization update
```

### 3. Anonymous to Authenticated Migration

```javascript
// Migration process when customer logs in
async function migrateAnonymousData(customerId, localStorageData) {
  try {
    // Get existing customer data
    const existing = await getCustomerMetafield(customerId, 'behavior_data');
    
    // Merge anonymous events with existing data
    const merged = mergeEventData(existing, localStorageData);
    
    // Update customer metafield
    await updateCustomerMetafield(customerId, 'behavior_data', merged);
    
    // Store migration record
    await recordMigration(customerId, localStorageData.persway_id);
    
    // Clear localStorage
    localStorage.removeItem('persway_data');
    
    // Re-evaluate audience assignment
    await evaluateCustomerAudience(customerId);
    
  } catch (error) {
    console.error('Migration failed:', error);
    // Keep localStorage data for retry
  }
}
```

## Performance Considerations

### Metafield Size Management
- **Customer behavior data**: Target 50-100KB, max 200KB
- **Shop audience config**: Target 200-500KB, max 1MB  
- **Recent events array**: Limit to 50 most recent events
- **Use data aggregation**: Store summaries instead of raw events

### Query Optimization
```graphql
# Efficient customer data query
query GetCustomerPersonalizationData($customerId: ID!) {
  customer(id: $customerId) {
    id
    metafields(namespace: "$app:persway_events", first: 5) {
      edges {
        node {
          key
          value
        }
      }
    }
  }
}
```

### Batch Operations
- Use GraphQL bulk operations for audience evaluations
- Group metafield updates to respect rate limits
- Implement exponential backoff for retries

## Privacy & Compliance

### GDPR Implementation
```json
{
  "privacy_controls": {
    "consent_required": true,
    "data_retention_days": 365,
    "export_format": "json",
    "deletion_cascade": true,
    "anonymization_method": "aggregate_only"
  },
  "audit_trail": {
    "data_created": "2025-01-15T10:30:00Z",
    "consent_granted": "2025-01-15T10:30:00Z", 
    "last_accessed": "2025-01-15T10:45:00Z",
    "retention_expires": "2026-01-15T10:30:00Z"
  }
}
```

### Data Minimization
- Only store events listed in FEATURES.md
- Aggregate data after 90 days
- Automatic cleanup of expired data
- No PII in event data (use Shopify IDs only)

## Migration & Versioning Strategy

### Schema Versioning
- Include `version` field in all JSON structures
- Implement backward compatibility for 2 versions
- Plan migration scripts for schema updates

### Data Migration Process
1. Deploy new schema support alongside old
2. Migrate data in batches using background jobs
3. Update app logic to use new schema
4. Remove old schema support after grace period

## Error Handling & Fallbacks

### Metafield Operation Failures
```javascript
// Graceful degradation strategy
try {
  await updateCustomerMetafield(customerId, data);
} catch (error) {
  // Fallback to localStorage
  fallbackToLocalStorage(data);
  // Queue for retry
  queueForRetry(customerId, data);
  // Log for monitoring
  logError('metafield_update_failed', error);
}
```

### Theme Extension Fallbacks
- Always show default content if audience data unavailable
- Implement client-side caching for audience assignments
- Use progressive enhancement approach

---

**Critical Reminders:**
1. Test all data structures thoroughly before production deployment
2. Monitor metafield sizes and query performance continuously  
3. Implement comprehensive error handling and fallbacks
4. Respect Shopify's rate limits and best practices
5. Maintain GDPR compliance throughout data lifecycle