# Active Development TODO

**Last Updated**: 2025-01-02  
**Current Phase**: Phase 1 Foundation (completing) → Phase 2 Core Features (starting)

## ✅ Completed
- [x] Project documentation (OVERVIEW.md, ARCHITECTURE.md, FEATURES.md)
- [x] Basic Remix app setup
- [x] Data model design (DATA_MODELS.md)
- [x] CLAUDE.md guidance document

## 🔄 Current Focus: Phase 1 Completion

### Task 1: Update Shopify App Configuration
**Priority**: High  
**Estimated Time**: 30 minutes  
**Dependencies**: None

**Subtasks**:
- [ ] Update `shopify.app.toml` with required scopes for customer/shop metafields
- [ ] Verify current scopes: `write_products` → expand to full metafield access
- [ ] Test scope changes in development environment
- [ ] Document scope requirements in CLAUDE.md

**Required Scopes**:
```toml
scopes = "write_customers,read_customers,write_customer_metafields,read_customer_metafields,write_shop_metafields,read_shop_metafields,write_products,read_products"
```

### Task 2: Create Metafield Definitions
**Priority**: High  
**Estimated Time**: 1-2 hours  
**Dependencies**: Task 1 (scope updates)

**Subtasks**:
- [ ] Create GraphQL mutations for metafield definitions
- [ ] Implement customer metafield definitions:
  - [ ] `$app:persway_events.behavior_data` (JSON)
  - [ ] `$app:persway_session.migration_data` (JSON)
- [ ] Implement shop metafield definitions:
  - [ ] `$app:persway_config.audiences` (JSON)  
  - [ ] `$app:persway_config.theme_blocks` (JSON)
- [ ] Create setup script/route to initialize metafield definitions
- [ ] Test metafield creation in development store
- [ ] Add error handling for definition conflicts

### Task 3: Basic Metafield Operations Library
**Priority**: High  
**Estimated Time**: 2-3 hours  
**Dependencies**: Task 2 (metafield definitions)

**Subtasks**:
- [ ] Create `app/lib/metafields.ts` utility library
- [ ] Implement customer metafield CRUD operations:
  - [ ] `getCustomerBehaviorData(customerId)`
  - [ ] `updateCustomerBehaviorData(customerId, data)`
  - [ ] `getCustomerMigrationData(customerId)`
  - [ ] `updateCustomerMigrationData(customerId, data)`
- [ ] Implement shop metafield CRUD operations:
  - [ ] `getShopAudiences(shopId)`
  - [ ] `updateShopAudiences(shopId, audiences)`
  - [ ] `getShopThemeBlocks(shopId)`
  - [ ] `updateShopThemeBlocks(shopId, blocks)`
- [ ] Add comprehensive error handling and rate limiting
- [ ] Write unit tests for all metafield operations
- [ ] Create sample data for testing

## 📋 Next Up (Phase 2 Preparation)

### Task 4: Basic Admin Dashboard Structure
**Priority**: Medium  
**Dependencies**: Task 3 (metafield operations)
- [ ] Create audience list view route (`app/routes/app.audiences._index.tsx`)
- [ ] Create basic Polaris table layout
- [ ] Connect to shop metafields for audience data
- [ ] Add "Create New Audience" button (no functionality yet)

### Task 5: Audience Creation Interface
**Priority**: Medium  
**Dependencies**: Task 4 (dashboard structure)
- [ ] Create audience creation route (`app/routes/app.audiences.new.tsx`)
- [ ] Build Polaris form components for audience configuration
- [ ] Implement basic rule builder interface
- [ ] Save audience definitions to shop metafields

## 🚫 Not Started (Future Phases)
- Web Pixel API integration
- Customer audience assignment logic  
- Theme app extensions
- Privacy compliance features
- Performance optimization
- Production deployment

## ⚠️ Important Notes

### Development Rules
1. **Complete each task fully** before moving to the next
2. **Test thoroughly** in development store after each task
3. **Update this TODO.md** after completing each subtask
4. **Never leave broken code** - each task should be production-ready when marked complete
5. **Follow FEATURES.md scope** - no additional features beyond what's documented

### Current Blockers
- None identified

### Technical Debt
- None yet (early stage)

---

**Next Session Goal**: Complete Tasks 1-3 to establish solid metafield foundation before building any UI components.