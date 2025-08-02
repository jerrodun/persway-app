# Architecture & Technical Decisions

## ⚠️ Scope Control Notice
**This document defines the ONLY technical approaches to be used. Do not deviate from these patterns or add additional complexity without explicit approval.**

## Core Technical Decisions

### Framework: Remix (React + Node.js)
**Decision:** Use Shopify's official `shopify-app` template as the foundation. We are using the latest version with Remix and Typescript.

**Why Remix:**
- Official Shopify recommendation for 2024+
- Built-in TypeScript support
- File-based routing for clean API organization
- Server-side rendering for better performance
- Excellent integration with Shopify App Bridge
- Well-documented for AI-assisted development

**What This Means:**
- All admin UI built with React + Polaris components
- Backend API routes using Remix's file-based routing
- GraphQL for all Shopify API interactions
- No separate backend framework needed

### Data Storage: Metafields and localStorage Only
**Decision:** Use localStorage and Shopify metafields exclusively for data storage. No external database.
**localStorage:** Used when the customer is not logged into Shopify.
**Customer metafields:** Assigned to the customer ID when customer is logged in. Saves the events to metafields, and pushes all data saved in localStorage while customer was logged out.

**Why Metafields-Only:**
- Simplifies infrastructure (no database hosting/maintenance)
- Native Shopify integration
- Fast theme access for personalization
- Automatic backups and redundancy
- Lower operational costs
- Perfect for MVP scale

**Limitations We Accept:**
- 2MB limit per JSON metafield (sufficient for hundreds of audiences)
- No complex relational queries
- Limited analytics capabilities initially

### Theme Integration: App Extensions Only
**Decision:** Use Theme App Extensions exclusively. No manual theme file modifications. Keep it official and modern with Shopify best practices.

**Extension Types:**
1. **App Blocks** - For content sections (hero banners, featured collections)
2. **App Embeds** - For tracking pixels and invisible functionality

**Why App Extensions:**
- Theme-agnostic (works with any OS 2.0+ theme)
- Merchant-friendly (no custom code in their theme)
- Automatic updates without theme modifications
- Shopify App Store compliant
- Performance optimized through Shopify's CDN

### Data Collection: Web Pixel API Only
**Decision:** Use Shopify's Web Pixel API exclusively for behavioral data collection.

**Events We Track:**
- cart_viewed
- checkout_started
- checkout_completed
- collection_viewed
- page_viewed
- product_added_to_cart
- product_removed_from_cart
- product_viewed
- search_submitted

**Why Web Pixel API:**
- Privacy compliant by default
- Automatic cookie banner integration
- Sandboxed execution for security
- No custom tracking code needed
- GDPR/CCPA compliant out of the box

## System Architecture

### High-Level Data Flow
```
1. Customer browses store
2. Web Pixel API captures behavioral events
3. Audience assignment logic processes events
4. Customer metafield updated with audience ID
5. Theme app extension reads audience ID
6. Personalized content displayed based on audience config
```

### Performance Requirements
- **Page Load Impact:** <50ms additional load time
- **Theme Extension Size:** <10KB compressed JavaScript
- **API Response Time:** <200ms for audience lookups
- **Metafield Queries:** Batch when possible, max 10 customers per query

### Component Architecture

#### Admin Interface (Remix App)
```
app/
├── routes/
│   ├── app._index.tsx          # Dashboard overview
│   ├── app.audiences._index.tsx # Audience list
│   ├── app.audiences.new.tsx    # Create audience
│   ├── app.audiences.$id.tsx    # Edit audience
│   └── app.settings.tsx         # App configuration
├── components/
│   ├── AudienceForm.tsx        # Audience creation/editing
│   ├── AudienceList.tsx        # Audience management
│   └── CustomerSegments.tsx     # Audience preview
└── lib/
    ├── shopify.server.ts       # Shopify API client
    ├── metafields.ts          # Metafield operations
    └── audiences.ts           # Audience logic
```

#### Theme Extensions
```
extensions/
├── persway-hero-banner/        # Hero banner app block
│   ├── blocks/hero.liquid     # Liquid template
│   └── shopify.extension.toml # Configuration
└── persway-pixel/             # Web pixel tracking
    ├── src/index.js          # Event collection
    └── shopify.extension.toml # Configuration
```

## Critical Technical Constraints

### Metafields Limits (Must Respect)
- **Per Resource:** 128 metafields maximum per customer/shop
- **JSON Size:** 2MB maximum per metafield
- **Definitions:** 200 metafield definitions per resource type
- **Performance:** Queries degrade after 24 metafields per resource

### GraphQL Rate Limits
- **Cost Limit:** 1,000 points per bucket
- **Refill Rate:** 50 points per second
- **Query Optimization:** Use fragments, avoid deep nesting

### Theme Extension Limits
- **Total Size:** 10MB per extension
- **JavaScript:** 10KB compressed recommended
- **CSS:** 100KB compressed recommended
- **Assets:** Must be served via Shopify CDN

## Development Patterns

### Error Handling
- Graceful degradation for theme extensions
- Fallback to default content when personalization fails
- Comprehensive logging for debugging
- Never break the customer shopping experience

### Testing Strategy
- Unit tests for audience assignment logic
- Integration tests for Shopify API operations
- Theme extension testing in development stores
- Performance testing under load

## Security Considerations

### Data Privacy
- Customer behavioral data stays within Shopify ecosystem (easy with metafield only approach)
- No external data transmission
- Automatic compliance with regional privacy laws
- Transparent data usage policies

### API Security
- Shopify OAuth for app authentication
- Rate limiting respect and graceful handling
- Secure credential management

## Migration Strategy (Future Considerations)

When we eventually need a database:
1. **Keep customer metafields** - They're perfect for theme integration
2. **Move audience definitions** - To database for complex queries
3. **Add analytics tables** - For reporting and insights
4. **Maintain backward compatibility** - Gradual migration approach

## Performance Monitoring

### Key Metrics to Track
- Audience assignment response time
- Theme extension load impact
- Metafield query performance
- Customer experience impact

### Optimization Techniques
- Lazy loading for non-critical features
- Efficient GraphQL query design
- Minimal JavaScript in theme context
- CDN utilization for static assets

---

**Remember:** This architecture is designed for MVP simplicity while maintaining scalability options. Resist adding complexity until it's proven necessary.