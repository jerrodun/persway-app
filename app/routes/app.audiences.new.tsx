import { useState } from "react";
import { type ActionFunctionArgs, type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { useActionData, useNavigation, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  Banner,
  Text,
  BlockStack,
  Box,
  InlineStack,
  Divider,
  Badge,
  List,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getShopAudiences, updateShopAudiences, createDefaultShopAudiences } from "../lib/metafields";

interface ActionData {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// Available events from FEATURES.md
const AVAILABLE_EVENTS = [
  { label: 'Cart Viewed', value: 'cart_viewed' },
  { label: 'Checkout Started', value: 'checkout_started' },
  { label: 'Checkout Completed', value: 'checkout_completed' },
  { label: 'Collection Viewed', value: 'collection_viewed' },
  { label: 'Page Viewed', value: 'page_viewed' },
  { label: 'Product Added to Cart', value: 'product_added_to_cart' },
  { label: 'Product Removed from Cart', value: 'product_removed_from_cart' },
  { label: 'Product Viewed', value: 'product_viewed' },
  { label: 'Search Submitted', value: 'search_submitted' },
];

const OPERATORS = [
  { label: 'Contains', value: 'contains' },
  { label: 'Equals', value: 'equals' },
  { label: 'Greater than', value: 'gt' },
  { label: 'Less than', value: 'lt' },
  { label: 'Greater than or equal', value: 'gte' },
  { label: 'Less than or equal', value: 'lte' },
];

const RULE_TYPES = [
  { label: 'All conditions must be met (AND)', value: 'and' },
  { label: 'Any condition can be met (OR)', value: 'or' },
];

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  
  try {
    const formData = await request.formData();
    const action = formData.get('_action');

    if (action === 'create_audience') {
      // Extract form data
      const name = formData.get('name')?.toString() || '';
      const description = formData.get('description')?.toString() || '';
      const priority = parseInt(formData.get('priority')?.toString() || '1');
      const ruleType = formData.get('ruleType')?.toString() as 'and' | 'or' || 'and';
      
      // Extract rule conditions
      const eventType = formData.get('eventType')?.toString() || '';
      const filter = formData.get('filter')?.toString() || '';
      const operator = formData.get('operator')?.toString() || 'contains';
      const value = formData.get('value')?.toString() || '';
      const countThreshold = parseInt(formData.get('countThreshold')?.toString() || '1');
      const timeframeDays = parseInt(formData.get('timeframeDays')?.toString() || '30');

      // Validation
      const fieldErrors: Record<string, string> = {};
      
      if (!name.trim()) {
        fieldErrors.name = 'Audience name is required';
      }
      if (!eventType) {
        fieldErrors.eventType = 'Event type is required';
      }
      if (!value.trim()) {
        fieldErrors.value = 'Rule value is required';
      }
      if (countThreshold < 1) {
        fieldErrors.countThreshold = 'Count threshold must be at least 1';
      }
      if (timeframeDays < 1) {
        fieldErrors.timeframeDays = 'Timeframe must be at least 1 day';
      }

      if (Object.keys(fieldErrors).length > 0) {
        return json<ActionData>({ fieldErrors });
      }

      // Get existing audiences or create default structure
      let shopAudiences = await getShopAudiences(admin);
      if (!shopAudiences) {
        shopAudiences = createDefaultShopAudiences();
      }

      // Generate unique ID
      const audienceId = `audience_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create new audience
      const newAudience = {
        id: audienceId,
        name: name.trim(),
        description: description.trim(),
        priority,
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        rules: {
          type: ruleType,
          conditions: [
            {
              event_type: eventType,
              filter: filter || undefined,
              operator,
              value,
              count_threshold: countThreshold,
              timeframe_days: timeframeDays,
            },
          ],
        },
        performance_metrics: {
          customer_count: 0,
          last_evaluated: new Date().toISOString(),
          avg_assignment_time_ms: 0,
        },
      };

      // Add to audiences array
      shopAudiences.audiences.push(newAudience);
      
      // Update statistics
      shopAudiences.statistics.total_audiences = shopAudiences.audiences.length;
      shopAudiences.statistics.active_audiences = shopAudiences.audiences.filter(a => a.status === 'active').length;

      // Save to metafields
      await updateShopAudiences(admin, shopAudiences);

      // Redirect to audiences list
      return redirect('/app/audiences');
    }

    return json<ActionData>({ error: 'Invalid action' });
  } catch (error) {
    console.error('Failed to create audience:', error);
    return json<ActionData>({ 
      error: error instanceof Error ? error.message : 'Failed to create audience' 
    });
  }
}

export default function NewAudience() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'submitting';

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('1');
  const [ruleType, setRuleType] = useState('and');
  const [eventType, setEventType] = useState('');
  const [filter, setFilter] = useState('');
  const [operator, setOperator] = useState('contains');
  const [value, setValue] = useState('');
  const [countThreshold, setCountThreshold] = useState('1');
  const [timeframeDays, setTimeframeDays] = useState('30');

  return (
    <Page>
      <TitleBar title="Create New Audience" />
      
      <Layout>
        <Layout.Section>
          <Form method="post">
            <input type="hidden" name="_action" value="create_audience" />
            
            <BlockStack gap="500">
              {/* Error Banner */}
              {actionData?.error && (
                <Banner status="critical" title="Error creating audience">
                  <p>{actionData.error}</p>
                </Banner>
              )}

              {/* Basic Information */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Basic Information
                  </Text>
                  
                  <FormLayout>
                    <TextField
                      label="Audience Name"
                      name="name"
                      value={name}
                      onChange={setName}
                      placeholder="e.g., Cat Lovers, High Value Customers"
                      error={actionData?.fieldErrors?.name}
                      helpText="Choose a descriptive name that clearly identifies this customer segment"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="Description"
                      name="description"
                      value={description}
                      onChange={setDescription}
                      placeholder="e.g., Customers who frequently view cat products"
                      multiline={3}
                      helpText="Optional description to help you remember what this audience represents"
                      autoComplete="off"
                    />
                    
                    <Select
                      label="Priority Level"
                      name="priority"
                      options={[
                        { label: '1 (Highest Priority)', value: '1' },
                        { label: '2', value: '2' },
                        { label: '3', value: '3' },
                        { label: '4', value: '4' },
                        { label: '5 (Medium Priority)', value: '5' },
                        { label: '6', value: '6' },
                        { label: '7', value: '7' },
                        { label: '8', value: '8' },
                        { label: '9', value: '9' },
                        { label: '10 (Lowest Priority)', value: '10' },
                      ]}
                      value={priority}
                      onChange={setPriority}
                      helpText="If a customer matches multiple audiences, they'll be assigned to the highest priority one"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Audience Rules */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Audience Rules
                  </Text>
                  
                  <Text as="p" variant="bodyMd">
                    Define the conditions that determine which customers belong to this audience.
                  </Text>

                  <FormLayout>
                    <Select
                      label="Rule Logic"
                      name="ruleType"
                      options={RULE_TYPES}
                      value={ruleType}
                      onChange={setRuleType}
                      helpText="Choose how multiple conditions should be evaluated"
                    />
                  </FormLayout>

                  <Divider />

                  {/* Single Rule Builder (MVP) */}
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="400">
                      <Text as="h3" variant="headingSm">
                        Condition 1
                      </Text>
                      
                      <FormLayout>
                        <FormLayout.Group>
                          <Select
                            label="Customer Event"
                            name="eventType"
                            placeholder="Select an event"
                            options={[
                              { label: 'Select an event...', value: '', disabled: true },
                              ...AVAILABLE_EVENTS
                            ]}
                            value={eventType}
                            onChange={setEventType}
                            error={actionData?.fieldErrors?.eventType}
                            helpText="Choose which customer behavior to track"
                          />
                          
                          <TextField
                            label="Filter Field"
                            name="filter"
                            value={filter}
                            onChange={setFilter}
                            placeholder="e.g., category, product_id"
                            helpText="Optional: specify what to filter by (e.g., 'category' for product category)"
                            autoComplete="off"
                          />
                        </FormLayout.Group>

                        <FormLayout.Group>
                          <Select
                            label="Operator"
                            name="operator"
                            options={OPERATORS}
                            value={operator}
                            onChange={setOperator}
                            helpText="How to compare the filter value"
                          />
                          
                          <TextField
                            label="Value"
                            name="value"
                            value={value}
                            onChange={setValue}
                            placeholder="e.g., cats, premium"
                            error={actionData?.fieldErrors?.value}
                            helpText="The value to compare against"
                            autoComplete="off"
                          />
                        </FormLayout.Group>

                        <FormLayout.Group>
                          <TextField
                            label="Count Threshold"
                            name="countThreshold"
                            type="number"
                            value={countThreshold}
                            onChange={setCountThreshold}
                            min={1}
                            error={actionData?.fieldErrors?.countThreshold}
                            helpText="Minimum number of times the event must occur"
                            autoComplete="off"
                          />
                          
                          <TextField
                            label="Timeframe (Days)"
                            name="timeframeDays"
                            type="number"
                            value={timeframeDays}
                            onChange={setTimeframeDays}
                            min={1}
                            error={actionData?.fieldErrors?.timeframeDays}
                            helpText="Within how many days the events must occur"
                            autoComplete="off"
                          />
                        </FormLayout.Group>
                      </FormLayout>
                    </BlockStack>
                  </Box>

                  {/* Rule Preview */}
                  <Box padding="300" background="bg-surface-info" borderRadius="200">
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm">
                        Rule Preview
                      </Text>
                      <Text as="p" variant="bodyMd" color="subdued">
                        Customers who have <Badge status="info">performed the selected event</Badge> with 
                        the specified conditions <Badge status="info">at least the threshold number of times</Badge> within 
                        the <Badge status="info">specified timeframe</Badge> will be assigned to this audience.
                      </Text>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>

              {/* Form Actions */}
              <Card>
                <InlineStack align="end" gap="300">
                  <Button url="/app/audiences">
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    submit 
                    loading={isLoading}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating Audience...' : 'Create Audience'}
                  </Button>
                </InlineStack>
              </Card>
            </BlockStack>
          </Form>
        </Layout.Section>

        {/* Help Sidebar */}
        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Creating Effective Audiences
                </Text>
                <List>
                  <List.Item>
                    <strong>Start Simple:</strong> Begin with basic behavioral rules and refine over time
                  </List.Item>
                  <List.Item>
                    <strong>Set Priorities:</strong> Lower numbers = higher priority for overlapping audiences
                  </List.Item>
                  <List.Item>
                    <strong>Monitor Performance:</strong> Check customer counts to ensure proper assignment
                  </List.Item>
                  <List.Item>
                    <strong>Test Timeframes:</strong> Adjust day ranges based on your customer behavior patterns
                  </List.Item>
                </List>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Example Rules
                </Text>
                <Text as="h3" variant="headingSm">
                  Cat Lovers
                </Text>
                <Text as="p" variant="bodyMd" color="subdued">
                  Event: Product Viewed<br/>
                  Filter: category<br/>
                  Operator: contains<br/>
                  Value: cats<br/>
                  Count: 3+ times in 30 days
                </Text>
                
                <Text as="h3" variant="headingSm">
                  High Value Customers
                </Text>
                <Text as="p" variant="bodyMd" color="subdued">
                  Event: Checkout Completed<br/>
                  Filter: total_value<br/>
                  Operator: greater than<br/>
                  Value: 200<br/>
                  Count: 1+ times in 365 days
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}