# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Persway.io is a Shopify personalization platform that enables merchants to deliver theme customization based on customer behavior. Built using Shopify's official Remix template, it uses a metafields-only architecture with no external database for customer data.

## Essential Commands

### Development
```bash
npm run dev              # Start development server with Shopify CLI
npm run build           # Build for production
npm start              # Start production server
npm run setup          # Generate Prisma client and run migrations
```

### Database Management
```bash
npx prisma generate          # Generate Prisma client
npx prisma migrate deploy    # Deploy database migrations
npx prisma migrate dev       # Create new migrations in development
```

### Code Quality
```bash
npm run lint            # Run ESLint with caching
npm run typecheck      # Run TypeScript type checking
```

### Deployment
```bash
npm run deploy         # Deploy app to Shopify
npm run config:link    # Link app configuration
```

## Architecture & Key Patterns

### Data Storage Strategy
- **Customer Data**: Stored in customer metafields (logged in) or localStorage (anonymous)
- **Audience Definitions**: Stored in shop metafields
- **Sessions Only**: SQLite/Prisma used only for Shopify session management
- **No External Database**: All business data uses Shopify's native storage

### File Structure
```
app/
├── routes/              # Remix routes (file-based routing)
│   ├── app._index.tsx   # Dashboard
│   ├── app.tsx          # App layout wrapper
│   └── webhooks.*.tsx   # Webhook handlers
├── shopify.server.ts    # Shopify API configuration
├── db.server.ts         # Prisma client (sessions only)
└── routes.ts            # Route configuration
```

### Key Technical Decisions
1. **Remix + TypeScript**: Using Shopify's official template
2. **Metafields-Only**: No external database for customer/audience data
3. **Theme App Extensions**: For frontend personalization
4. **Web Pixel API**: For privacy-compliant behavioral tracking
5. **Performance Target**: <50ms additional page load time

### Shopify Configuration
- **API Version**: 2025-07
- **Scopes**: write_customers,read_customers,write_products,read_products
- **Embedded**: true (runs inside Shopify admin)
- **App ID**: 6aade9a5865703b7630aba698e963152

### Required Scopes Explanation
- **write_customers, read_customers**: Required for accessing customer resources and creating/reading customer metafields
- **write_products, read_products**: Required for product operations and metafield access
- **Note**: Metafield access is controlled through resource scopes, not separate metafield-specific scopes

### Development Workflow
1. Always run `npm run dev` for local development
2. Use Shopify CLI for app interactions
3. Test with development stores only
4. Check performance impact on every feature
5. Use Polaris components for admin UI consistency

### App Onboarding Process
When a merchant installs Persway.io, the following metafield definitions are automatically created:

#### Customer Metafields (for behavior tracking):
- `$app:persway_events.behavior_data` - Customer behavioral events and audience assignments
- `$app:persway_session.migration_data` - Anonymous session data migration tracking

#### Shop Metafields (for configuration):
- `$app:persway_config.audiences` - Audience definitions and rules
- `$app:persway_config.theme_blocks` - Personalized content configurations

**Manual Setup**: For development/testing, visit `/app/setup` to initialize metafield definitions
**Production**: Metafield definitions should be created automatically on app installation (future implementation)

### Critical Implementation Notes
- **Privacy First**: Use Web Pixel API only for tracking
- **Scope Control**: Only implement explicitly requested features
- **No External Services**: Use Shopify's native capabilities
- **Progressive Enhancement**: Simple features before complex
- **Performance**: Monitor <50ms page load impact requirement

### Database Schema
Currently only session management via Prisma:
- Sessions stored in SQLite (dev) or configured database (production)
- All business data uses Shopify metafields, not the database

### Testing Approach
- Use development stores for testing
- Run lint and typecheck before commits
- Test performance impact of all frontend changes
- Verify metafield schemas before deployment

## Documentation Directory

### Project Documentation (docs/)
1. **OVERVIEW.md** - Project vision, scope control guidelines, and roadmap
   - Core value proposition: Simple personalization for $500K-$1M merchants
   - Strict scope control rules (ONLY build what's explicitly requested)
   - Current status: Phase 1 Foundation
   - Business model: SaaS ($49-299/month) + services

2. **ARCHITECTURE.md** - Technical decisions and constraints
   - Remix + TypeScript foundation
   - Metafields-only data storage (no external DB)
   - Theme App Extensions only (no manual theme modifications)
   - Web Pixel API for privacy-compliant tracking
   - Performance requirements (<50ms page load impact)
   - Metafield limits (128 per resource, 2MB JSON size)

3. **FEATURES.md** - MVP feature specifications
   - Audience Management Interface (list, create, edit)
   - Customer Audience Assignment System
   - Theme App Extension System (hero banner block)
   - Web Pixel Integration (9 specific events tracked)
   - Admin Dashboard (overview metrics)

4. **DATA_MODELS.md** - Complete data structure specifications
   - Customer metafield schemas (behavior_data, migration_data)
   - Shop metafield schemas (audiences, theme_blocks)
   - localStorage structure for anonymous users
   - Event processing pipeline and migration strategies
   - Privacy compliance and performance considerations

### Implementation Guidelines
- **Scope Control**: Never add features not in FEATURES.md
- **Performance**: Always measure <50ms page load impact
- **Privacy**: Use Web Pixel API only, no custom tracking
- **Quality**: Complete features must be production-ready
- **Documentation**: Update docs before implementing new features