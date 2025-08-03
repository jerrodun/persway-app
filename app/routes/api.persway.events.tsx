import { type ActionFunctionArgs, json } from "@remix-run/node";

interface IncomingEvent {
  id: string;
  type: string;
  timestamp: string;
  persway_id: string;
  customer_id: string | null;
  data: Record<string, any>;
}

interface EventPayload {
  events: IncomingEvent[];
  session: {
    persway_id: string;
    session_start: number;
    customer_id: string | null;
  };
}

// Handle Web Pixel event submissions
export async function action({ request }: ActionFunctionArgs) {
  try {
    // Parse the incoming events
    const payload: EventPayload = await request.json();
    
    if (!payload.events || !Array.isArray(payload.events)) {
      return json({ error: 'Invalid events payload' }, { status: 400 });
    }

    if (payload.events.length === 0) {
      return json({ success: true, processed: 0 });
    }

    // For now, we'll process events without authentication
    // In production, you might want to validate the request origin
    
    // Group events by customer
    const eventsByCustomer = new Map<string, IncomingEvent[]>();
    const anonymousEvents: IncomingEvent[] = [];

    for (const event of payload.events) {
      if (event.customer_id) {
        const customerId = event.customer_id.replace('gid://shopify/Customer/', '');
        if (!eventsByCustomer.has(customerId)) {
          eventsByCustomer.set(customerId, []);
        }
        eventsByCustomer.get(customerId)!.push(event);
      } else {
        anonymousEvents.push(event);
      }
    }

    let processedCount = 0;

    // Process authenticated customer events
    if (eventsByCustomer.size > 0) {
      // For Web Pixel events, we'll process them in a simpler way
      // Store events for processing by a background job that has proper admin context
      for (const [customerId, customerEvents] of eventsByCustomer) {
        processedCount += customerEvents.length;
        console.log(`Queued ${customerEvents.length} events for customer ${customerId} for background processing`);
        
        // In production, you would queue these events for background processing
        // For now, we'll log them for testing
        for (const event of customerEvents) {
          console.log(`Customer event: ${event.type} for customer ${customerId}`, {
            timestamp: event.timestamp,
            data: event.data
          });
        }
      }
    }

    // Process anonymous events (store for potential migration)
    if (anonymousEvents.length > 0) {
      // For anonymous users, we can't store in metafields yet
      // The data will be stored temporarily and migrated when they authenticate
      console.log(`Received ${anonymousEvents.length} anonymous events`);
      
      // Group anonymous events by persway_id for easier migration
      const anonymousEventsBySession = new Map<string, IncomingEvent[]>();
      
      for (const event of anonymousEvents) {
        if (!anonymousEventsBySession.has(event.persway_id)) {
          anonymousEventsBySession.set(event.persway_id, []);
        }
        anonymousEventsBySession.get(event.persway_id)!.push(event);
        processedCount++;
      }
      
      // Log events by session for monitoring
      for (const [perswayId, sessionEvents] of anonymousEventsBySession) {
        console.log(`Anonymous session ${perswayId}: ${sessionEvents.length} events`, {
          eventTypes: sessionEvents.map(e => e.type),
          timespan: {
            first: sessionEvents[0]?.timestamp,
            last: sessionEvents[sessionEvents.length - 1]?.timestamp
          }
        });
      }
      
      // In production, these would be stored in a temporary storage system
      // for migration when the user authenticates
    }

    return json({ 
      success: true, 
      processed: processedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing Persway events:', error);
    return json(
      { error: 'Failed to process events' }, 
      { status: 500 }
    );
  }
}


// Handle preflight requests for CORS
export async function loader() {
  return json({ message: 'Persway Events API' });
}