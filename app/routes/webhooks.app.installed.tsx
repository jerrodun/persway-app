import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createAllMetafieldDefinitions, getShopId } from "../lib/metafield-definitions";

/**
 * Automatic App Installation Handler
 * 
 * This webhook is triggered when the app is installed on a shop.
 * It automatically sets up all required metafield definitions and 
 * initializes the app configuration.
 */

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { admin } = await authenticate.webhook(request);
    
    console.log("App installed webhook received");

    // Create all required metafield definitions
    await createAllMetafieldDefinitions(admin);
    
    // Initialize default configurations
    await initializeDefaultConfigurations(admin);

    console.log("App installation setup completed successfully");

    return json({ success: true });
  } catch (error) {
    console.error("App installation setup failed:", error);
    return json({ 
      error: error instanceof Error ? error.message : "Installation failed" 
    }, { status: 500 });
  }
}

// Metafield definition creation is now handled by the centralized utility

/**
 * Initialize default configurations for the app
 */
async function initializeDefaultConfigurations(admin: any): Promise<void> {
  try {
    // Initialize default shop audiences configuration
    const defaultAudiences = {
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

    // Initialize default theme blocks configuration
    const defaultThemeBlocks = {
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

    // Get shop ID for metafield updates
    const shopId = await getShopId(admin);

    // Create initial metafields
    const metafieldMutation = `
      mutation createInitialMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    await admin.graphql(metafieldMutation, {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace: "$app:persway_config",
            key: "audiences",
            value: JSON.stringify(defaultAudiences),
            type: "json"
          },
          {
            ownerId: shopId,
            namespace: "$app:persway_config", 
            key: "theme_blocks",
            value: JSON.stringify(defaultThemeBlocks),
            type: "json"
          }
        ]
      }
    });

    console.log("Default configurations initialized successfully");
  } catch (error) {
    console.error("Failed to initialize default configurations:", error);
    // Don't throw - let the installation complete even if this fails
  }
}