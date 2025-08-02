# Feature Specifications

## ⚠️ Scope Control Notice
**These are the ONLY features to be implemented for MVP. Do not add features not explicitly listed here.**

## Core Feature Set (MVP Only)

### 1. Audience Management Interface

#### 1.1 Audience List View
**Purpose:** Allow merchants to view and manage all created audiences.

**Interface Requirements:**
- Simple Polaris table layout with: Audience Name, Priority, Customer Count
- "Create New Audience" button
- Edit/Delete actions per audience
- **NO SEARCH OR FILTERING** - Keep it simple for MVP
- **NO BULK OPERATIONS** - One audience at a time

**Data Display:**
```
┌─────────────────┬──────────┬───────────────┬──────────────┬─────────┐
│ Audience Name   │ Priority │ Customer Count│ Created      │ Actions │
├─────────────────┼──────────┼───────────────┼──────────────┼─────────┤
│ Cat Lovers      │ 1        │ 47 customers  │ Jan 15, 2025 │ Edit    │
│ Dog Owners      │ 2        │ 23 customers  │ Jan 10, 2025 │ Edit    │
│ Fish Enthusiasts│ 3        │ 12 customers  │ Jan 8, 2025  │ Edit    │
└─────────────────┴──────────┴───────────────┴──────────────┴─────────┘
```

#### 1.2 Audience Creation Flow
**Purpose:** Enable merchants to create new customer audiences based on collected data.

**Step 1: Basic Information**
- Audience Name (required, max 50 characters)
- Priority Level (1-10, with 1 being highest priority)
- Description (optional, max 200 characters)

**Step 2: Audience Rules (Keep Simple)**
- Basic conditional rules (and/or, if/else)
- A rule for each data point collected (based on Shopify's Standard Events in the [Web Pixel API](https://shopify.dev/docs/api/web-pixels-api/standard-api))
- The **only** events we want to capture are:
  - cart_viewed
  - checkout_started
  - checkout_completed
  - collection_viewed
  - page_viewed
  - product_added_to_cart
  - product_removed_from_cart
  - product_viewed
  - search_submitted

**UI Flow:**
1. Select rule type from dropdown
2. Configure rule parameters
3. Preview estimated audience size
4. Save audience
5. Audience ID is generated (this will be used to assign theme app blocks to audiences)

#### 1.3 Audience Editing
**Purpose:** Allow merchants to modify existing audiences.

**Editable Fields:**
- Name and description
- Priority level
- Rule parameters
- Time frame for rules

### 2. Customer Audience Assignment System

#### 2.1 Automatic Assignment Logic
**Purpose:** Automatically assign customers to audiences when conditions are met.

**Assignment Process:**
1. Web Pixel API captures customer purchase events
2. Background process evaluates customer against all audience rules
3. Customer assigned to highest priority matching audience
4. Customer metafield updated with audience ID

**Priority System:**
- Each audience has priority 1-10 (1 = highest)
- Customer matches multiple audiences → highest priority wins
- Ties broken by creation date (newer audience wins)
- Unmatched customers remain in "default" audience (no metafield)

**Assignment Frequency:**
- Immediately when an audience is created
- Real-time when a new customer event is detected
- Manual "update" option for merchants in the dashboard

### 3. Theme App Extension System

#### 3.1 Hero Banner App Block
**Purpose:** Display different hero images/content based on customer audience.

**Configuration Options (Theme Editor):**
- Hero Image (for unassigned customers)
- Heading Text
- Button Text & Link
- Audience ID **(this section is only displayed to customers with the same ID)**

### 4. Web Pixel Integration

#### 4.1 Event Tracking
**Purpose:** Collect customer behavioral data for audience assignment.
**Events:**
- cart_viewed
- checkout_started
- checkout_completed
- collection_viewed
- page_viewed
- product_added_to_cart
- product_removed_from_cart
- product_viewed
- search_submitted

**Data Sent to Backend:**
- Customer ID (metafields if logged in)
- Persway ID (localStorage if not logged in)
- All tracked events
- Purchase history

#### 4.2 Privacy Compliance
**Purpose:** Ensure GDPR/CCPA compliance automatically.

**Implementation:**
- Use Shopify's Customer Privacy API
- Respect cookie consent settings
- Only track consented customers
- Automatic regional compliance

### 5. Admin Dashboard

#### 5.1 Overview Dashboard
**Purpose:** Provide merchants with key metrics and quick access to features.

**Dashboard Widgets:**
- Total Audiences Created
- Total Customers Assigned
- Most Popular Audience
- Recent Activity Log

**Quick Actions:**
- Create New Audience
- View All Audiences

### Customer Experience Flow
1. Customer browses store (Web Pixel tracks behavior)
2. Customer makes purchase (triggers audience evaluation)
3. Customer assigned to relevant audience
4. Content updates in real-time based on behavior

### Audience Management Flow
1. Merchant logs into Persway admin
2. Views audience list with current metrics
3. Clicks "Create New Audience"
4. Selects rule type and configures parameters
5. Previews estimated audience size
6. Saves audience with priority setting
7. Configures theme content for new audience

## Technical Implementation Notes

### Performance Requirements
- Audience evaluation: <200ms per customer
- Theme extension load: <50ms additional page load
- Admin interface response: <500ms for all operations
- Metafield queries: Batch operations when possible

### Error Handling
- Graceful degradation if audience data unavailable
- Default content shown when personalization fails
- Comprehensive error logging for debugging
- Never break customer shopping experience

---

**Remember:** This feature set is designed to prove core value proposition. Every feature must be explicitly requested before implementation. Resist feature creep at all costs. Each feature should be completed in full before moving on to the next feature unless 100% required to complete the current feature. A feature should be marked as done when it is ready for a production environment. While this is an MVP product it is meant for production.
