# Active Development TODO

**Last Updated**: 2025-08-02  
**Current Phase**: Phase 2 Core Features (COMPLETE) → Phase 3 Advanced Features (starting)

## ✅ Completed
- [x] Project documentation (OVERVIEW.md, ARCHITECTURE.md, FEATURES.md)
- [x] Basic Remix app setup
- [x] Data model design (DATA_MODELS.md)
- [x] CLAUDE.md guidance document
- [x] **Task 1**: Shopify app scope configuration for metafield access
- [x] **Task 2**: Metafield definitions and setup infrastructure
- [x] **Task 3**: Basic metafield operations library
- [x] **Task 4**: Basic admin dashboard structure (audience list view)
- [x] **Task 5**: Audience creation interface (complete form system)

## 🔄 Current Focus: Phase 3 - Path A (Customer Experience)

**Selected Path**: Path A - Customer Experience (Immediate Value)  
**Goal**: Enable actual customer personalization with behavior tracking and audience assignment

### Task 6: Web Pixel API Integration
**Priority**: High  
**Estimated Time**: 2-3 hours  
**Dependencies**: Tasks 1-5 (audience management complete)

**Subtasks**:
- [ ] Create Web Pixel extension for event tracking
- [ ] Implement customer behavior data collection  
- [ ] Handle anonymous vs authenticated user tracking
- [ ] Set up data flow from pixel to metafields
- [ ] Test event capture and data validation

### Task 7: Customer Audience Assignment Logic
**Priority**: High  
**Estimated Time**: 2-3 hours  
**Dependencies**: Task 6 (behavior data collection)

**Subtasks**:
- [ ] Create background audience evaluation system
- [ ] Implement rule matching against customer data
- [ ] Handle priority-based audience assignment  
- [ ] Create assignment workflow and triggers
- [ ] Test customer assignment accuracy and performance

## 📋 Future Development Paths (Preserved for Later)

### Path B: Merchant Experience Enhancements
**Goal**: Polish audience management interface  
**Status**: Documented for future implementation

#### Planned Features:
- Audience editing and deletion functionality
- Bulk operations (activate/deactivate multiple audiences)
- Advanced rule builder with multiple conditions
- Audience performance dashboard and analytics
- Rule templates and optimization suggestions

### Path C: Production Readiness & Theme Integration
**Goal**: Prepare for real-world deployment  
**Status**: Documented for future implementation

#### Planned Features:
- Theme App Extensions (hero banner personalization)
- Automatic app onboarding webhook system
- Comprehensive error monitoring and logging
- Performance optimization and load testing
- App Store submission preparation

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

**Current Status**: ✅ **Phase 2 Complete** - Full audience management system operational

**Achievement**: Merchants can now create, view, and manage customer audiences with sophisticated behavioral rules. The foundation for customer personalization is complete.

**Next Decision**: Choose development path based on priorities:
- **Path A** (Customer Experience): Enable actual customer personalization with Web Pixel tracking
- **Path B** (Merchant Experience): Polish audience management with editing, deletion, and analytics  
- **Path C** (Production Readiness): Build theme extensions and production infrastructure