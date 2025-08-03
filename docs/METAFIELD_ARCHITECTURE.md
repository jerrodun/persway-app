# Persway Metafield Architecture

**Last Updated**: 2025-08-03  
**Status**: Production Ready  
**Purpose**: Comprehensive guide to Persway's metafield-based data storage system

---

## 🎯 Overview

Persway uses **Shopify metafields** as the primary data storage mechanism, avoiding external databases for business data. This architecture provides native Shopify integration, automatic scaling, and simplified deployment while maintaining high performance.

### Why Metafields?

**Benefits:**
- ✅ **Native Integration**: Works seamlessly with Shopify's ecosystem
- ✅ **No External Database**: Reduces infrastructure complexity and costs  
- ✅ **Automatic Scaling**: Shopify handles all storage scaling
- ✅ **Built-in Security**: App-owned namespaces ensure data isolation
- ✅ **GraphQL API**: Efficient querying and updating
- ✅ **GDPR Compliance**: Data automatically inherits Shopify's compliance features

**Trade-offs:**
- ⚠️ **Size Limits**: 2MB per metafield (manageable with data design)
- ⚠️ **Query Patterns**: Best for key-value access, not complex joins
- ⚠️ **Rate Limits**: Must respect Shopify's API limits

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Customer      │    │      Shop           │    │     Web Pixel       │
│   Metafields    │    │   Metafields        │    │   (Event Source)    │
├─────────────────┤    ├─────────────────────┤    ├─────────────────────┤
│ behavior_data   │◄──┤│ audiences           │◄──┤│ Tracks 9 Events     │
└─────────────────┘    │ theme_blocks        │    │ Anonymous Storage   │
                       └─────────────────────┘    └─────────────────────┘
```

### Data Flow

1. **Event Capture**: Web Pixel tracks customer behavior
2. **Storage Decision**: Anonymous → localStorage, Authenticated → Customer metafields  
3. **Audience Processing**: Shop metafields store rules and assignments
4. **Personalization**: Theme blocks deliver customized content

---

## 📊 Metafield Structure

### 🧑‍💼 Customer Metafields

Customer metafields store **individual customer data** that travels with the customer across devices and sessions.

#### 1. Behavior Data (`$app:persway_events.behavior_data`)

**Purpose**: Primary customer behavior tracking and audience assignment  
**Owner**: Customer resource  
**Type**: JSON  
**Size Target**: ~100KB  
**Access**: App-owned, merchant-readable

```typescript
// Code to read customer behavior data
import { getCustomerBehaviorData } from '~/lib/metafields';

const behaviorData = await getCustomerBehaviorData(admin, customerId);
```

**Data Structure:**
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
    "product_viewed": {
      "count": 12,
      "categories": { "cats": 8, "dogs": 2 },
      "last_at": "2025-01-15T09:30:00Z"
    }
  },
  "affinity_scores": {
    "cat_lover": 0.85,
    "dog_owner": 0.15
  },
  "recent_events": [
    {
      "type": "product_viewed",
      "timestamp": "2025-01-15T09:30:00Z",
      "product_id": "gid://shopify/Product/123",
      "category": "cats"
    }
  ],
  "data_retention": {
    "created_at": "2024-12-01T10:00:00Z",
    "last_updated": "2025-01-15T10:30:00Z",
    "expires_at": "2025-12-01T10:00:00Z"
  }
}
```


### 🏪 Shop Metafields

Shop metafields store **app configuration** that applies to the entire store and all customers.

#### 1. Audience Configuration (`$app:persway_config.audiences`)

**Purpose**: Store audience definitions, rules, and global settings  
**Owner**: Shop resource  
**Type**: JSON  
**Size Target**: ~500KB  
**Access**: App-owned, merchant-readable

```typescript
// Code to manage audience configuration
import { getShopAudiences, updateShopAudiences } from '~/lib/metafields';

const audiences = await getShopAudiences(admin);
await updateShopAudiences(admin, updatedAudiences);
```

**Data Structure:**
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
          }
        ]
      },
      "performance_metrics": {
        "customer_count": 47,
        "last_evaluated": "2025-01-15T10:00:00Z",
        "avg_assignment_time_ms": 45
      }
    }
  ],
  "global_settings": {
    "evaluation_frequency": "real_time",
    "max_recent_events": 50,
    "data_retention_days": 365,
    "privacy_mode": "strict"
  },
  "statistics": {
    "total_audiences": 2,
    "active_audiences": 2,
    "total_customers_assigned": 70
  }
}
```

#### 2. Theme Block Configuration (`$app:persway_config.theme_blocks`)

**Purpose**: Store personalized content for theme app extensions  
**Owner**: Shop resource  
**Type**: JSON  
**Size Target**: ~250KB  
**Access**: App-owned, merchant-readable

```typescript
// Code to manage theme personalization
import { getShopThemeBlocks, updateShopThemeBlocks } from '~/lib/metafields';

const themeBlocks = await getShopThemeBlocks(admin);
await updateShopThemeBlocks(admin, updatedBlocks);
```

**Data Structure:**
```json
{
  "version": "1.0",
  "hero_banners": {
    "default": {
      "image_url": "https://cdn.shopify.com/default-hero.jpg",
      "heading": "Everything for Your Beloved Pets",
      "subheading": "Quality products for all your pet needs",
      "button_text": "Shop Now",
      "button_url": "/collections/all",
      "background_color": "#f8f9fa"
    },
    "cat_lovers_001": {
      "image_url": "https://cdn.shopify.com/cat-hero.jpg", 
      "heading": "Perfect Products for Your Feline Friend",
      "subheading": "From toys to treats, everything cats love",
      "button_text": "Shop Cat Products",
      "button_url": "/collections/cats",
      "background_color": "#fff3cd"
    }
  },
  "block_settings": {
    "fallback_strategy": "default",
    "cache_duration_seconds": 300,
    "performance_monitoring": true
  }
}
```

---

## 🔧 Implementation Details

### Metafield Definitions

All metafield definitions are centralized in `/app/lib/metafield-definitions.ts`:

```typescript
// Centralized metafield definitions
import { ALL_METAFIELD_DEFINITIONS, createAllMetafieldDefinitions } from '~/lib/metafield-definitions';

// Create all definitions during app installation
const result = await createAllMetafieldDefinitions(admin);
```

**Required Shopify Scopes:**
```toml
# In shopify.app.toml
scopes = "write_customers,read_customers,write_products,read_products"
# Note: Metafield access is controlled through resource scopes, not separate metafield scopes
```

### Auto-Installation

Metafield definitions are automatically created when the app is installed:

```typescript
// /app/routes/webhooks.app.installed.tsx
export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.webhook(request);
  
  // Automatically create all metafield definitions
  await createAllMetafieldDefinitions(admin);
  
  // Initialize default configurations  
  await initializeDefaultConfigurations(admin);
}
```

### Installation Status Monitoring

Real-time installation status is available at `/app/installation`:

```typescript
// Check installation status
const installationStatus = await checkInstallationStatus(admin);

// Results include:
// - metafield_definitions: complete | partial | missing
// - web_pixel: installed | missing | error  
// - overall_progress: 0-100%
// - ready_for_use: boolean
```

### Error Handling & Rate Limiting

Built-in protection against API limits and errors:

```typescript
// Rate limiting (40 requests per minute)
import { MetafieldError, RateLimitError } from '~/lib/metafields';

try {
  await updateCustomerBehaviorData(admin, customerId, data);
} catch (error) {
  if (error instanceof RateLimitError) {
    // Wait and retry
    setTimeout(() => retry(), error.retryAfter);
  }
  if (error instanceof MetafieldError) {
    // Handle metafield-specific errors
    console.error('Metafield operation failed:', error.message);
  }
}
```

### Data Validation

Automatic size validation prevents exceeding limits:

```typescript
// Size validation is built-in
import { validateMetafieldSize } from '~/lib/metafield-definitions';

// Validates against target sizes
validateMetafieldSize(data, 200, 'Customer behavior data'); // 200KB limit
validateMetafieldSize(data, 500, 'Audience configuration'); // 500KB limit
```

---

## 📈 Performance Considerations

### Size Optimization

**Customer Data (Target: 100KB each)**
- Store event **summaries**, not raw events
- Limit `recent_events` to 50 most recent  
- Use category **counts** instead of individual product IDs
- Aggregate data older than 90 days

**Shop Configuration (Target: 500KB total)**
- Limit to ~100 audiences maximum
- Use efficient rule structures
- Cache frequently accessed data

### Query Optimization

```typescript
// Efficient single metafield query
const behaviorData = await getCustomerBehaviorData(admin, customerId);

// Batch operations for multiple customers
const customers = await Promise.all(
  customerIds.map(id => getCustomerBehaviorData(admin, id))
);
```

### Caching Strategy

- **Theme blocks**: 5-minute cache duration
- **Audience rules**: Cache until updated
- **Customer assignments**: Real-time evaluation

---

## 🔒 Security & Privacy

### App-Owned Namespaces

All metafields use `$app:` prefix for security:
- **Merchants can read** but **cannot modify** data
- **Only the app** can write to these namespaces
- **Automatic cleanup** when app is uninstalled

### GDPR Compliance

```typescript
// Built-in data retention
"data_retention": {
  "created_at": "2024-12-01T10:00:00Z",
  "expires_at": "2025-12-01T10:00:00Z" // 1 year automatic expiry
}
```

**Privacy Features:**
- ✅ **No PII storage**: Only Shopify IDs and behavioral patterns
- ✅ **Automatic expiry**: 1-year data retention
- ✅ **User consent**: Respects customer privacy preferences  
- ✅ **Data export**: JSON format for GDPR requests
- ✅ **Right to deletion**: Automatic cleanup on customer deletion

### Access Controls

```typescript
// Metafield access configuration
access: {
  admin: "MERCHANT_READ",     // Merchants can view in admin
  storefront: "NONE"          // Not accessible via Storefront API
}
```

---

## 🧪 Testing & Debugging

### Installation Testing

```bash
# Test complete installation flow
npm run dev
# Navigate to /app/installation
# Verify all components show "Complete" status
```

### Data Validation Testing

```typescript
// Test metafield operations
import { getCustomerBehaviorData, updateCustomerBehaviorData } from '~/lib/metafields';

// Create test data
const testData = createDefaultCustomerBehaviorData();
await updateCustomerBehaviorData(admin, 'test-customer-id', testData);

// Verify retrieval
const retrieved = await getCustomerBehaviorData(admin, 'test-customer-id');
console.assert(retrieved.version === '1.0');
```

### Size Monitoring

```typescript
// Monitor metafield sizes in production
const data = await getShopAudiences(admin);
const sizeKB = JSON.stringify(data).length / 1024;
console.log(`Audience data size: ${sizeKB.toFixed(1)}KB`);

// Alert if approaching limits
if (sizeKB > 400) { // 80% of 500KB limit
  console.warn('Audience data approaching size limit');
}
```

---

## 🔄 Data Migration & Versioning

### Schema Versioning

All metafields include version information:

```json
{
  "version": "1.0",
  // ... data
}
```

### Migration Strategy

```typescript
// Handle version migrations
function migrateCustomerData(data: any): CustomerBehaviorData {
  if (data.version === '1.0') {
    return data; // Current version
  }
  
  // Future migrations would go here
  // if (data.version === '0.9') {
  //   return migrateFrom0_9(data);
  // }
  
  throw new Error(`Unsupported data version: ${data.version}`);
}
```

---

## 📚 Quick Reference

### Common Operations

```typescript
// Customer behavior tracking
import { getCustomerBehaviorData, updateCustomerBehaviorData } from '~/lib/metafields';

// Read customer data
const behavior = await getCustomerBehaviorData(admin, customerId);

// Update customer data  
await updateCustomerBehaviorData(admin, customerId, updatedData);

// Audience management
import { getShopAudiences, updateShopAudiences } from '~/lib/metafields';

// Get all audiences
const audiences = await getShopAudiences(admin);

// Update audience configuration
await updateShopAudiences(admin, updatedAudiences);

// Installation management
import { createAllMetafieldDefinitions } from '~/lib/metafield-definitions';

// Setup metafields
await createAllMetafieldDefinitions(admin);
```

### File Structure

```
app/
├── lib/
│   ├── metafield-definitions.ts    # Centralized definitions & utilities
│   └── metafields.ts              # CRUD operations & types
├── routes/
│   ├── app.installation.tsx       # Installation status dashboard
│   └── webhooks.app.installed.tsx # Auto-setup on install
└── docs/
    └── METAFIELD_ARCHITECTURE.md  # This documentation
```

### Key Constants

```typescript
// Namespaces
const CUSTOMER_BEHAVIOR = '$app:persway_events.behavior_data';
const SHOP_AUDIENCES = '$app:persway_config.audiences';
const SHOP_THEME_BLOCKS = '$app:persway_config.theme_blocks';

// Size limits (KB)
const CUSTOMER_BEHAVIOR_LIMIT = 200;
const SHOP_AUDIENCES_LIMIT = 500;
const SHOP_THEME_BLOCKS_LIMIT = 250;
```

---

## ✅ Next Steps

After reviewing this architecture:

1. **Test Installation**: Visit `/app/installation` to verify setup
2. **Create First Audience**: Use `/app/audiences/new` to test data flow
3. **Monitor Performance**: Check metafield sizes in production
4. **Review Security**: Ensure proper access controls in Shopify admin

This architecture provides a solid foundation for scalable, secure customer personalization within Shopify's ecosystem. 🚀