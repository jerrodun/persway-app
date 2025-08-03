import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { 
  getCustomerBehaviorData, 
  updateCustomerBehaviorData, 
  createDefaultCustomerBehaviorData 
} from "../lib/metafields";
import type { CustomerBehaviorData } from "../lib/metafields";

interface StoredEvent {
  id: string;
  type: string;
  timestamp: string;
  persway_id: string;
  customer_id: string;
  data: Record<string, any>;
}

interface EventProcessingRequest {
  customer_id: string;
  events: StoredEvent[];
}

// Process stored customer events with admin context
export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  try {
    const payload: EventProcessingRequest = await request.json();
    
    if (!payload.customer_id || !payload.events || !Array.isArray(payload.events)) {
      return json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Get existing customer behavior data or create default
    let behaviorData = await getCustomerBehaviorData(admin, payload.customer_id);
    
    if (!behaviorData) {
      behaviorData = createDefaultCustomerBehaviorData();
    }

    // Update behavior data with new events
    const updatedData = updateBehaviorDataFromEvents(behaviorData, payload.events);
    
    // Save updated data
    await updateCustomerBehaviorData(admin, payload.customer_id, updatedData);

    return json({ 
      success: true, 
      processed: payload.events.length,
      customer_id: payload.customer_id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing customer events:', error);
    return json(
      { error: 'Failed to process customer events' }, 
      { status: 500 }
    );
  }
}

// Helper function to update customer behavior data from events
function updateBehaviorDataFromEvents(
  behaviorData: CustomerBehaviorData,
  events: StoredEvent[]
): CustomerBehaviorData {
  const now = new Date().toISOString();
  
  for (const event of events) {
    // Update event summaries based on event type
    switch (event.type) {
      case 'cart_viewed':
        behaviorData.event_summary.cart_viewed.count++;
        behaviorData.event_summary.cart_viewed.last_at = event.timestamp;
        if (event.data.cart_value) {
          const currentAvg = behaviorData.event_summary.cart_viewed.avg_cart_value;
          const currentCount = behaviorData.event_summary.cart_viewed.count;
          behaviorData.event_summary.cart_viewed.avg_cart_value = 
            (currentAvg * (currentCount - 1) + parseFloat(event.data.cart_value)) / currentCount;
        }
        break;

      case 'checkout_started':
        behaviorData.event_summary.checkout_started.count++;
        behaviorData.event_summary.checkout_started.last_at = event.timestamp;
        // Calculate conversion rate
        const totalCheckouts = behaviorData.event_summary.checkout_started.count;
        const completedCheckouts = behaviorData.event_summary.checkout_completed.count;
        behaviorData.event_summary.checkout_started.conversion_rate = 
          totalCheckouts > 0 ? (completedCheckouts / totalCheckouts) * 100 : 0;
        break;

      case 'checkout_completed':
        behaviorData.event_summary.checkout_completed.count++;
        behaviorData.event_summary.checkout_completed.last_at = event.timestamp;
        if (event.data.order_value) {
          behaviorData.event_summary.checkout_completed.total_value += parseFloat(event.data.order_value);
        }
        // Update conversion rate
        const totalCheckoutsForConversion = behaviorData.event_summary.checkout_started.count;
        const completedCheckoutsForConversion = behaviorData.event_summary.checkout_completed.count;
        behaviorData.event_summary.checkout_started.conversion_rate = 
          totalCheckoutsForConversion > 0 ? (completedCheckoutsForConversion / totalCheckoutsForConversion) * 100 : 0;
        break;

      case 'product_viewed':
        behaviorData.event_summary.product_viewed.count++;
        behaviorData.event_summary.product_viewed.last_at = event.timestamp;
        // Track product categories
        if (event.data.product_type) {
          const category = event.data.product_type.toLowerCase();
          behaviorData.event_summary.product_viewed.categories[category] = 
            (behaviorData.event_summary.product_viewed.categories[category] || 0) + 1;
        }
        break;

      case 'collection_viewed':
        behaviorData.event_summary.collection_viewed.count++;
        behaviorData.event_summary.collection_viewed.last_at = event.timestamp;
        if (event.data.collection_handle && 
            !behaviorData.event_summary.collection_viewed.collections.includes(event.data.collection_handle)) {
          behaviorData.event_summary.collection_viewed.collections.push(event.data.collection_handle);
        }
        break;

      case 'search_submitted':
        behaviorData.event_summary.search_submitted.count++;
        behaviorData.event_summary.search_submitted.last_at = event.timestamp;
        if (event.data.search_term && 
            !behaviorData.event_summary.search_submitted.terms.includes(event.data.search_term)) {
          behaviorData.event_summary.search_submitted.terms.push(event.data.search_term);
        }
        break;

      case 'product_added_to_cart':
      case 'product_removed_from_cart':
        // These events contribute to overall engagement but don't have specific summaries
        // They'll be tracked in recent_events
        break;

      case 'page_viewed':
        // Page views contribute to session data and engagement
        behaviorData.session_data.total_sessions++;
        break;
    }

    // Add to recent events (keep only the most recent)
    behaviorData.recent_events.push({
      type: event.type,
      timestamp: event.timestamp,
      ...event.data
    });

    // Keep only the 50 most recent events
    if (behaviorData.recent_events.length > 50) {
      behaviorData.recent_events = behaviorData.recent_events.slice(-50);
    }

    // Update affinity scores based on event data
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

  // Update session data
  behaviorData.session_data.last_session = now;

  // Update retention data
  behaviorData.data_retention.last_updated = now;

  return behaviorData;
}

// Simple admin interface to manually process events (for testing)
export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  
  return json({
    message: 'Customer Event Processing API',
    endpoints: {
      post: 'Process stored customer events with admin context'
    }
  });
}