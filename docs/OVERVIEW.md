# Persway.io - Shopify Personalization Platform

## Project Vision

Persway.io delivers **simple, effective personalization** for mid-market Shopify merchants ($500K-$1M revenue) who want data-driven theme customization without enterprise complexity or cost.

**Core Value Proposition:** Enable merchants to show different theme sections to different customer audiences based on purchase behavior and browsing patterns.

### Example Use Case
A pet store segments customers into "cat owners" and "dog owners" based on purchase and browsing history. Cat owners see hero banners featuring cat products, while dog owners see dog-focused content. Everyone else sees general pet imagery.

## ⚠️ CRITICAL: Scope Control Guidelines

**Claude Code MUST follow these rules:**

### ✅ ONLY BUILD WHAT'S EXPLICITLY REQUESTED
- Stick to the exact features defined in FEATURES.md
- Do not add "helpful" features that aren't specified
- Do not build complex admin dashboards beyond basic CRUD
- Do not implement advanced analytics until explicitly requested
- Complete one task/feature before moving onto the next. A complete feature would be considered production-ready for an MVP app

### ❌ FORBIDDEN ADDITIONS
- Complex reporting/analytics (basic audience member count only)
- Advanced audience overlap detection
- A/B testing functionality
- Email integration
- External API integrations beyond Shopify
- Complex user permission systems
- Advanced filtering/search (basic list view only)

### 📋 When Adding Features
1. Must be explicitly requested in project documentation
2. Must align with MVP goals (simple audience assignment + theme personalization)
3. Must not require external services or databases
4. Update FEATURES.md before implementing
5. Document. Document. Document! Each new feature should be well documented.

## Current Status & Roadmap

### ✅ Phase 1: Foundation (Current)
- [x] Project documentation
- [x] Basic Remix app setup
- [ ] Customer metafield schema design
- [ ] Shop metafield schema for audiences

### 🔄 Phase 2: Core Features (Next)
- [ ] Web Pixel API integration for data collection
- [ ] Audience management CRUD interface
- [ ] Customer audience assignment logic
- [ ] Basic theme app extension (hero banner)

### 📋 Phase 3: Polish (Future)
- [ ] Priority system for overlapping audiences
- [ ] Additional app blocks (featured collection, announcement bar)
- [ ] Privacy compliance integration
- [ ] Performance optimization

### 🚀 Phase 4: Launch Preparation
- [ ] Production deployment setup
- [ ] App store submission preparation
- [ ] Documentation for merchants

## Documentation Structure

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical decisions and system design
- **[FEATURES.md](./FEATURES.md)** - Detailed feature specifications and user flows
- **[API_REFERENCE.md](./API_REFERENCE.md)** - Shopify API integration patterns *(Coming Soon)*
- **[DATA_MODELS.md](./DATA_MODELS.md)** - Metafield schemas and data structures *(Coming Soon)*

## Development Principles

### Keep It Simple
- Use Shopify's native features whenever possible
- Metafields-only data storage for MVP
- Minimal external dependencies
- Use Polaris for the app dashbaord
- Progressive enhancement over complex features

### Performance First
- <50ms additional page load time
- Minimal JavaScript in theme extensions
- Efficient GraphQL queries
- CDN-cached audience logic

### Privacy by Design
- Web Pixel API only (no custom tracking)
- Automatic cookie banner integration
- GDPR compliant data handling
- Transparent data usage

## Target Market

**Primary:** Shopify Plus merchants doing $500K-$1M annual revenue
**Secondary:** Growing Shopify stores ready for basic personalization

**Positioning:** More sophisticated than basic Shopify features, less complex than enterprise platforms like Dynamic Yield.

## Business Model

- **SaaS:** $49-299/month based on audience count and features
- **Services:** Custom audience strategy, theme integration, optimization ($2K-5K projects)
- **Retainers:** Ongoing optimization and support ($2K-4K/month)

---

**Remember:** This is an MVP focused on proving the core value proposition. Resist the urge to build everything at once. Each feature must earn its place in the codebase.