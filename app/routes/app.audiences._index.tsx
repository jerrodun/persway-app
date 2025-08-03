import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  Text,
  Badge,
  EmptyState,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getShopAudiences } from "../lib/metafields";

interface LoaderData {
  audiences: Array<{
    id: string;
    name: string;
    description: string;
    priority: number;
    status: 'active' | 'inactive';
    customer_count: number;
    created_at: string;
  }>;
  totalCustomersAssigned: number;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const { admin } = await authenticate.admin(request);

  try {
    // Get shop audiences from metafields
    const shopAudiences = await getShopAudiences(admin);
    
    let audiences: LoaderData['audiences'] = [];
    let totalCustomersAssigned = 0;

    if (shopAudiences && shopAudiences.audiences.length > 0) {
      audiences = shopAudiences.audiences.map(audience => ({
        id: audience.id,
        name: audience.name,
        description: audience.description,
        priority: audience.priority,
        status: audience.status,
        customer_count: audience.performance_metrics.customer_count,
        created_at: audience.created_at,
      }));
      
      totalCustomersAssigned = shopAudiences.statistics.total_customers_assigned;
    }

    return json<LoaderData>({
      audiences,
      totalCustomersAssigned,
    });
  } catch (error) {
    console.error('Failed to load audiences:', error);
    return json<LoaderData>({
      audiences: [],
      totalCustomersAssigned: 0,
    });
  }
}

export default function AudiencesIndex() {
  const { audiences, totalCustomersAssigned } = useLoaderData<LoaderData>();

  // Format data for DataTable
  const tableRows = audiences.map(audience => [
    audience.name,
    audience.priority.toString(),
    audience.customer_count.toString(),
    <Badge key={`status-${audience.id}`} status={audience.status === 'active' ? 'success' : 'warning'}>
      {audience.status === 'active' ? 'Active' : 'Inactive'}
    </Badge>,
    new Date(audience.created_at).toLocaleDateString(),
    <InlineStack key={`actions-${audience.id}`} gap="200">
      <Button variant="tertiary" size="slim">
        Edit
      </Button>
      <Button variant="tertiary" size="slim" tone="critical">
        Delete
      </Button>
    </InlineStack>,
  ]);

  const headings = [
    'Audience Name',
    'Priority',
    'Customers',
    'Status',
    'Created',
    'Actions',
  ];

  return (
    <Page>
      <TitleBar title="Customer Audiences">
        <Button variant="primary" url="/app/audiences/new">
          Create New Audience
        </Button>
      </TitleBar>

      <Layout>
        <Layout.Section>
          {audiences.length === 0 ? (
            <Card>
              <EmptyState
                heading="Create your first customer audience"
                action={{
                  content: 'Create Audience',
                  url: '/app/audiences/new',
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text as="p" variant="bodyMd">
                  Start personalizing your store by creating customer audiences based on 
                  browsing behavior, purchase history, and engagement patterns.
                </Text>
              </EmptyState>
            </Card>
          ) : (
            <BlockStack gap="500">
              {/* Summary Cards */}
              <Layout>
                <Layout.Section variant="oneThird">
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd">
                        Total Audiences
                      </Text>
                      <Text as="p" variant="headingLg">
                        {audiences.length}
                      </Text>
                    </BlockStack>
                  </Card>
                </Layout.Section>
                <Layout.Section variant="oneThird">
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd">
                        Active Audiences
                      </Text>
                      <Text as="p" variant="headingLg">
                        {audiences.filter(a => a.status === 'active').length}
                      </Text>
                    </BlockStack>
                  </Card>
                </Layout.Section>
                <Layout.Section variant="oneThird">
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd">
                        Customers Assigned
                      </Text>
                      <Text as="p" variant="headingLg">
                        {totalCustomersAssigned}
                      </Text>
                    </BlockStack>
                  </Card>
                </Layout.Section>
              </Layout>

              {/* Audiences Table */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">
                      All Audiences
                    </Text>
                    <Button variant="primary" url="/app/audiences/new">
                      Create New Audience
                    </Button>
                  </InlineStack>
                  
                  <DataTable
                    columnContentTypes={[
                      'text', // Audience Name
                      'numeric', // Priority
                      'numeric', // Customers
                      'text', // Status
                      'text', // Created
                      'text', // Actions
                    ]}
                    headings={headings}
                    rows={tableRows}
                    footerContent={`Showing ${audiences.length} audience${audiences.length === 1 ? '' : 's'}`}
                  />
                </BlockStack>
              </Card>
            </BlockStack>
          )}
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Quick Actions
                </Text>
                <BlockStack gap="300">
                  <Link to="/app/audiences/new">
                    <Button fullWidth>Create New Audience</Button>
                  </Link>
                  <Link to="/app/installation">
                    <Button fullWidth variant="tertiary">Installation Status</Button>
                  </Link>
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Audience Tips
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Priority Levels:</strong> Lower numbers have higher priority. 
                  If a customer matches multiple audiences, they'll be assigned to the highest priority one.
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Performance:</strong> Audiences are evaluated in real-time as customers 
                  browse and purchase. Monitor customer counts to ensure proper assignment.
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}