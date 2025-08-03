import { type ActionFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { 
  getCustomerBehaviorData, 
  updateCustomerBehaviorData, 
  createDefaultCustomerBehaviorData,
  getCustomerMigrationData,
  updateCustomerMigrationData
} from "../lib/metafields";
import type { CustomerBehaviorData } from "../lib/metafields";

interface MigrationRequest {
  customer_id: string;
  persway_id: string;
  anonymous_events: Array<{
    id: string;
    type: string;
    timestamp: string;
    data: Record<string, any>;
  }>;
  session_summary: {
    session_start: string;
    pages_viewed: number;
    products_viewed: number;
    time_spent: number;
    categories_browsed: string[];
  };
}

// Handle migration of anonymous user data to authenticated customer
export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  try {
    const payload: MigrationRequest = await request.json();
    
    if (!payload.customer_id || !payload.persway_id || !payload.anonymous_events) {
      return json({ error: 'Invalid migration payload' }, { status: 400 });
    }

    const customerId = payload.customer_id.replace('gid://shopify/Customer/', '');

    // Get existing customer behavior data or create default
    let behaviorData = await getCustomerBehaviorData(admin, customerId);
    
    if (!behaviorData) {
      behaviorData = createDefaultCustomerBehaviorData();
    }

    // Process anonymous events and merge with existing data
    const updatedData = mergeAnonymousEvents(behaviorData, payload.anonymous_events);

    // Update customer behavior data
    await updateCustomerBehaviorData(admin, customerId, updatedData);

    // Update migration tracking
    await recordMigration(admin, customerId, payload);

    console.log(`Successfully migrated ${payload.anonymous_events.length} events for customer ${customerId} from session ${payload.persway_id}`);

    return json({ 
      success: true, 
      migrated_events: payload.anonymous_events.length,
      customer_id: customerId,
      persway_id: payload.persway_id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error migrating anonymous user data:', error);
    return json(
      { error: 'Failed to migrate anonymous data' }, 
      { status: 500 }
    );
  }
}

// Merge anonymous events into customer behavior data
function mergeAnonymousEvents(
  behaviorData: CustomerBehaviorData,
  anonymousEvents: Array<{ id: string; type: string; timestamp: string; data: Record<string, any> }>
): CustomerBehaviorData {
  const now = new Date().toISOString();
  
  for (const event of anonymousEvents) {
    // Update event summaries based on event type
    switch (event.type) {
      case 'cart_viewed':
        behaviorData.event_summary.cart_viewed.count++;
        if (!behaviorData.event_summary.cart_viewed.last_at || 
            event.timestamp > behaviorData.event_summary.cart_viewed.last_at) {
          behaviorData.event_summary.cart_viewed.last_at = event.timestamp;
        }
        if (event.data.cart_value) {
          const currentAvg = behaviorData.event_summary.cart_viewed.avg_cart_value;
          const currentCount = behaviorData.event_summary.cart_viewed.count;
          behaviorData.event_summary.cart_viewed.avg_cart_value = 
            (currentAvg * (currentCount - 1) + parseFloat(event.data.cart_value)) / currentCount;
        }
        break;

      case 'product_viewed':
        behaviorData.event_summary.product_viewed.count++;
        if (!behaviorData.event_summary.product_viewed.last_at || 
            event.timestamp > behaviorData.event_summary.product_viewed.last_at) {
          behaviorData.event_summary.product_viewed.last_at = event.timestamp;
        }
        // Track product categories
        if (event.data.product_type) {
          const category = event.data.product_type.toLowerCase();
          behaviorData.event_summary.product_viewed.categories[category] = 
            (behaviorData.event_summary.product_viewed.categories[category] || 0) + 1;
        }
        break;

      case 'collection_viewed':
        behaviorData.event_summary.collection_viewed.count++;
        if (!behaviorData.event_summary.collection_viewed.last_at || 
            event.timestamp > behaviorData.event_summary.collection_viewed.last_at) {
          behaviorData.event_summary.collection_viewed.last_at = event.timestamp;
        }
        if (event.data.collection_handle && 
            !behaviorData.event_summary.collection_viewed.collections.includes(event.data.collection_handle)) {
          behaviorData.event_summary.collection_viewed.collections.push(event.data.collection_handle);
        }
        break;

      case 'search_submitted':
        behaviorData.event_summary.search_submitted.count++;
        if (!behaviorData.event_summary.search_submitted.last_at || 
            event.timestamp > behaviorData.event_summary.search_submitted.last_at) {
          behaviorData.event_summary.search_submitted.last_at = event.timestamp;
        }
        if (event.data.search_term && 
            !behaviorData.event_summary.search_submitted.terms.includes(event.data.search_term)) {
          behaviorData.event_summary.search_submitted.terms.push(event.data.search_term);
        }
        break;

      case 'page_viewed':
        // Increment session count for migration
        behaviorData.session_data.total_sessions++;
        break;

      default:
        // Handle other event types
        break;
    }

    // Add to recent events
    behaviorData.recent_events.push({
      type: event.type,
      timestamp: event.timestamp,
      ...event.data,
      migrated: true // Mark as migrated from anonymous session
    });

    // Update affinity scores
    if (event.data.product_type) {
      const category = event.data.product_type.toLowerCase();
      behaviorData.affinity_scores[category] = 
        (behaviorData.affinity_scores[category] || 0) + 1;
    }

    if (event.data.vendor) {
      const vendor = event.data.vendor.toLowerCase();
      behaviorData.affinity_scores[vendor] = 
        (behaviorData.affinity_scores[vendor] || 0) + 0.5;
    }
  }

  // Keep only the 50 most recent events
  if (behaviorData.recent_events.length > 50) {
    behaviorData.recent_events.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    behaviorData.recent_events = behaviorData.recent_events.slice(0, 50);
  }

  // Update session data
  behaviorData.session_data.last_session = now;
  behaviorData.data_retention.last_updated = now;

  return behaviorData;
}

// Record migration for tracking and analysis
async function recordMigration(
  admin: any,
  customerId: string,
  payload: MigrationRequest
): Promise<void> {
  try {
    // Get existing migration data or create new
    let migrationData = await getCustomerMigrationData(admin, customerId);
    
    if (!migrationData) {
      migrationData = {
        version: "1.0",
        migrations: [],
        migration_stats: {
          total_migrations: 0,
          last_migration: null
        }
      };
    }

    // Add new migration record
    migrationData.migrations.push({
      persway_id: payload.persway_id,
      migrated_at: new Date().toISOString(),
      session_start: payload.session_summary.session_start,
      events_count: payload.anonymous_events.length,
      pre_auth_summary: payload.session_summary
    });

    // Update stats
    migrationData.migration_stats.total_migrations++;
    migrationData.migration_stats.last_migration = new Date().toISOString();

    // Keep only recent migrations (last 10)
    if (migrationData.migrations.length > 10) {
      migrationData.migrations = migrationData.migrations.slice(-10);
    }

    // Save migration data
    await updateCustomerMigrationData(admin, customerId, migrationData);

  } catch (error) {
    console.error('Error recording migration:', error);
    // Don't throw here - migration tracking is secondary to the main migration
  }
}

// Handle preflight requests for CORS
export async function loader() {
  return json({ 
    message: 'Persway Migration API',
    description: 'Migrates anonymous user data to authenticated customer records'
  });
}