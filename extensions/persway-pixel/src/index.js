/**
 * Persway.io Web Pixel Extension
 * 
 * Tracks customer behavior events for audience assignment and personalization.
 * Implements privacy-compliant data collection using Shopify's Web Pixel API.
 */

import {register} from '@shopify/web-pixels-extension';

register(({
  analytics,
  browser,
  settings,
  init
}) => {
  // Configuration
  const PERSWAY_CONFIG = {
    version: '1.0',
    maxEvents: 50,
    batchSize: 10,
    flushInterval: 30000, // 30 seconds
    debug: true,
    accountID: settings.accountID || 'persway-default'
  };

  // Event storage
  let eventQueue = [];
  let sessionData = {
    persway_id: null,
    session_start: Date.now(),
    events: []
  };

  /**
   * Initialize Persway tracking
   */
  function initializePersway() {
    // Generate or retrieve anonymous ID
    sessionData.persway_id = getOrCreatePerswayId();
    
    if (PERSWAY_CONFIG.debug) {
      console.log('Persway tracking initialized:', sessionData.persway_id, 'Account:', PERSWAY_CONFIG.accountID);
    }

    // Set up periodic event flushing
    setInterval(flushEvents, PERSWAY_CONFIG.flushInterval);
  }

  /**
   * Get or create anonymous Persway ID
   */
  function getOrCreatePerswayId() {
    let perswayId = browser.localStorage.getItem('persway_id');
    
    if (!perswayId) {
      perswayId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      browser.localStorage.setItem('persway_id', perswayId);
    }
    
    return perswayId;
  }

  /**
   * Track a customer event
   */
  function trackEvent(eventType, eventData = {}) {
  const event = {
    id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    type: eventType,
    timestamp: new Date().toISOString(),
    persway_id: sessionData.persway_id,
    customer_id: analytics.customerId || null,
    data: eventData
  };

  // Add to queue
  eventQueue.push(event);
  sessionData.events.push(event);

  // Keep only recent events
  if (sessionData.events.length > PERSWAY_CONFIG.maxEvents) {
    sessionData.events = sessionData.events.slice(-PERSWAY_CONFIG.maxEvents);
  }

  if (PERSWAY_CONFIG.debug) {
    console.log('Persway event tracked:', event);
  }

  // Flush if batch is full
  if (eventQueue.length >= PERSWAY_CONFIG.batchSize) {
    flushEvents();
  }
}

  /**
   * Send events to the server
   */
  async function flushEvents() {
  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = []; // Clear queue immediately

  try {
    const response = await browser.fetch('/api/persway/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Persway-Version': PERSWAY_CONFIG.version
      },
      body: JSON.stringify({
        events: eventsToSend,
        session: {
          persway_id: sessionData.persway_id,
          session_start: sessionData.session_start,
          customer_id: analytics.customerId || null
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (PERSWAY_CONFIG.debug) {
      console.log(`Persway: Sent ${eventsToSend.length} events`);
    }

  } catch (error) {
    console.error('Persway: Failed to send events:', error);
    // Re-queue events for retry
    eventQueue = [...eventsToSend, ...eventQueue];
  }
}

  /**
   * Extract product data from event
   */
  function extractProductData(data) {
  if (!data || !data.merchandise) return {};
  
  return {
    product_id: data.merchandise.product?.id || null,
    variant_id: data.merchandise.id || null,
    product_title: data.merchandise.product?.title || null,
    product_type: data.merchandise.product?.type || null,
    vendor: data.merchandise.product?.vendor || null,
    price: data.merchandise.price?.amount || null,
    currency: data.merchandise.price?.currencyCode || null
  };
}

  /**
   * Extract cart data from event
   */
  function extractCartData(data) {
  if (!data || !data.cart) return {};
  
  return {
    cart_id: data.cart.id || null,
    item_count: data.cart.lines?.length || 0,
    cart_value: data.cart.cost?.totalAmount?.amount || null,
    currency: data.cart.cost?.totalAmount?.currencyCode || null
  };
}

  // Initialize tracking
  initializePersway();

  // Subscribe to Shopify analytics events
    analytics.subscribe('cart_viewed', (event) => {
  trackEvent('cart_viewed', {
    ...extractCartData(event.data),
    url: event.context?.page?.url || init.context.document.location.href
    });
  });

    analytics.subscribe('checkout_started', (event) => {
  trackEvent('checkout_started', {
    checkout_id: event.data?.checkout?.order?.id || null,
    checkout_value: event.data?.checkout?.totalPrice?.amount || null,
    currency: event.data?.checkout?.totalPrice?.currencyCode || null,
    step: event.data?.checkout?.step || 'started'
  });
});

  analytics.subscribe('checkout_completed', (event) => {
  trackEvent('checkout_completed', {
    order_id: event.data?.checkout?.order?.id || null,
    order_value: event.data?.checkout?.totalPrice?.amount || null,
    currency: event.data?.checkout?.totalPrice?.currencyCode || null,
    customer_id: event.data?.checkout?.order?.customer?.id || null
  });
});

  analytics.subscribe('collection_viewed', (event) => {
  trackEvent('collection_viewed', {
    collection_id: event.data?.collection?.id || null,
    collection_handle: event.data?.collection?.handle || null,
    collection_title: event.data?.collection?.title || null,
    url: event.context?.page?.url || init.context.document.location.href
  });
});

  analytics.subscribe('page_viewed', (event) => {
  trackEvent('page_viewed', {
    url: event.context?.page?.url || init.context.document.location.href,
    page_type: event.context?.page?.pageType || null,
    referrer: event.context?.page?.referrer || init.context.document.referrer
  });
});

  analytics.subscribe('product_added_to_cart', (event) => {
  trackEvent('product_added_to_cart', {
    ...extractProductData(event.data),
    quantity: event.data?.quantity || 1,
    cart_id: event.data?.cart?.id || null
  });
});

  analytics.subscribe('product_removed_from_cart', (event) => {
  trackEvent('product_removed_from_cart', {
    ...extractProductData(event.data),
    quantity: event.data?.quantity || 1,
    cart_id: event.data?.cart?.id || null
  });
});

  analytics.subscribe('product_viewed', (event) => {
  trackEvent('product_viewed', {
    ...extractProductData(event.data),
    url: event.context?.page?.url || init.context.document.location.href
  });
});

  analytics.subscribe('search_submitted', (event) => {
  trackEvent('search_submitted', {
    search_term: event.data?.searchResult?.query || null,
    results_count: event.data?.searchResult?.productVariants?.length || 0,
    url: event.context?.page?.url || init.context.document.location.href
  });
});

/**
 * Handle customer login/authentication
 */
  function handleCustomerAuthentication() {
    const currentCustomerId = analytics.customerId;
    const previousCustomerId = browser.localStorage.getItem('persway_customer_id');
  
  if (currentCustomerId && currentCustomerId !== previousCustomerId) {
    // Customer just authenticated, migrate anonymous data
    const anonymousEvents = sessionData.events.filter(event => !event.customer_id);
    
    if (anonymousEvents.length > 0) {
      migrateAnonymousData(currentCustomerId, anonymousEvents);
    }
    
    // Store current customer ID
    browser.localStorage.setItem('persway_customer_id', currentCustomerId);
  }
}

  /**
   * Migrate anonymous session data to authenticated customer
   */
  async function migrateAnonymousData(customerId, anonymousEvents) {
  try {
    // Calculate session summary
    const sessionSummary = {
      session_start: new Date(sessionData.session_start).toISOString(),
      pages_viewed: anonymousEvents.filter(e => e.type === 'page_viewed').length,
      products_viewed: anonymousEvents.filter(e => e.type === 'product_viewed').length,
      time_spent: Date.now() - sessionData.session_start,
      categories_browsed: [...new Set(
        anonymousEvents
          .filter(e => e.data?.product_type)
          .map(e => e.data.product_type.toLowerCase())
      )]
    };

    const response = await browser.fetch('/api/persway/migrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Persway-Version': PERSWAY_CONFIG.version
      },
      body: JSON.stringify({
        customer_id: customerId,
        persway_id: sessionData.persway_id,
        anonymous_events: anonymousEvents,
        session_summary: sessionSummary
      })
    });

    if (response.ok) {
      if (PERSWAY_CONFIG.debug) {
        console.log(`Persway: Migrated ${anonymousEvents.length} anonymous events to customer ${customerId}`);
      }
      
      // Clear migrated events from local session
      sessionData.events = sessionData.events.filter(event => event.customer_id);
    } else {
      console.error('Persway: Failed to migrate anonymous data:', response.status);
    }

  } catch (error) {
    console.error('Persway: Migration error:', error);
  }
}

  // Check for customer authentication changes
  setInterval(handleCustomerAuthentication, 5000); // Check every 5 seconds

  // Flush events when page unloads
  browser.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      // Use sendBeacon for reliable event sending on page unload
      browser.sendBeacon('/api/persway/events', JSON.stringify({
        events: eventQueue,
        session: sessionData
      }));
    }
  });

  if (PERSWAY_CONFIG.debug) {
    console.log('Persway Web Pixel loaded successfully');
    
    // Expose debug functions for testing
    browser.window.persway = {
      trackEvent,
      flushEvents,
      getSessionData: () => sessionData,
      getEventQueue: () => eventQueue
    };
  }

}); // End of register function