# Persway.io App Onboarding Process

## Overview

This document outlines the onboarding process for merchants installing Persway.io, ensuring all required infrastructure is properly initialized for customer behavior tracking and audience management.

## Required Metafield Definitions

Persway.io requires four metafield definitions to be created during app installation:

### Customer Metafields
These store individual customer behavior data and enable cross-device tracking:

1. **Customer Behavior Data** (`$app:persway_events.behavior_data`)
   - **Purpose**: Stores customer behavioral events, audience assignments, and affinity scores
   - **Type**: JSON
   - **Target Size**: ~200KB for optimal performance
   - **Contains**: Event summaries, audience assignment, affinity scores, recent events

2. **Session Migration Data** (`$app:persway_session.migration_data`)
   - **Purpose**: Tracks data migrated from anonymous sessions when customer logs in
   - **Type**: JSON  
   - **Target Size**: ~50KB
   - **Contains**: Migration history, pre-authentication session summaries

### Shop Metafields
These store app configuration and audience management data:

3. **Audience Definitions** (`$app:persway_config.audiences`)
   - **Purpose**: Stores all audience definitions, rules, and performance metrics
   - **Type**: JSON
   - **Target Size**: ~500KB to support hundreds of audiences
   - **Contains**: Audience rules, priority settings, performance metrics

4. **Theme Block Configurations** (`$app:persway_config.theme_blocks`)
   - **Purpose**: Stores personalized content configurations for each audience
   - **Type**: JSON
   - **Target Size**: ~250KB
   - **Contains**: Hero banner configs, content variations, fallback settings

## Current Implementation Status

### ✅ Development Setup (Manual)
- **Route**: `/app/setup`
- **Purpose**: Manual initialization for development and testing
- **Features**: 
  - Interactive UI for creating metafield definitions
  - Error handling for existing definitions
  - Detailed success/failure reporting
  - Safe to run multiple times (checks for existing definitions)

### 🔄 Production Setup (Future Implementation)
For production app installation, metafield definitions should be created automatically via:

1. **App Installation Webhook** (Recommended)
   - Trigger: `app/installed` webhook
   - Process: Automatically create all required metafield definitions
   - Benefits: Seamless merchant experience, no manual steps required

2. **First App Load Detection** (Alternative)
   - Trigger: First time merchant accesses app
   - Process: Check for metafield definitions, create if missing
   - Benefits: Fallback option, handles edge cases

## Implementation Details

### GraphQL Mutations Used
- `metafieldDefinitionCreate` - Creates new metafield definitions
- `metafieldDefinitions` - Queries existing definitions to avoid duplicates

### Error Handling
- **Duplicate Detection**: Checks for existing definitions before creation
- **Validation Errors**: Handles Shopify API validation errors gracefully
- **Partial Failures**: Reports individual definition success/failure status
- **Retry Logic**: Safe to re-run setup process multiple times

### Security Considerations
- Uses app-reserved namespaces (`$app:persway_*`) for automatic cleanup on uninstall
- No sensitive data stored in metafield definitions themselves
- Follows Shopify's metafield best practices for app data

## Testing Procedure

### Development Testing
1. Install app in development store
2. Navigate to `/app/setup`
3. Click "Initialize Metafield Definitions"
4. Verify all 4 definitions are created successfully
5. Re-run setup to confirm duplicate detection works

### Production Testing (Future)
1. Install app in test store
2. Verify metafield definitions are created automatically
3. Confirm app functions without manual setup steps
4. Test uninstall process removes app data properly

## Troubleshooting

### Common Issues
1. **Scope Errors**: Ensure app has `write_customers` and `read_customers` scopes
2. **Duplicate Definitions**: Setup process safely handles existing definitions
3. **GraphQL Errors**: Check API rate limits and retry logic

### Verification Steps
To verify metafield definitions exist:
1. Shopify Admin → Settings → Custom data → Metafields
2. Look for metafield definitions in `$app:persway_*` namespaces
3. Or use GraphQL Admin API to query metafield definitions

## Future Enhancements

### Automatic Installation (Priority: High)
- Implement `app/installed` webhook handler
- Move setup logic to background process
- Add monitoring and alerting for setup failures

### Onboarding Flow (Priority: Medium)
- Create guided setup wizard for merchant configuration
- Add sample audience creation
- Include getting started guide and best practices

### Health Monitoring (Priority: Low)
- Add metafield definition health checks
- Implement automatic repair for missing definitions
- Create admin alerts for configuration issues

---

**Implementation Notes:**
- Current manual setup is production-ready for MVP
- Automatic setup should be implemented before App Store submission
- All metafield definitions use safe, reversible configurations