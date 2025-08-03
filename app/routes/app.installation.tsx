import { type LoaderFunctionArgs, type ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Banner,
  ProgressBar,
  Icon,
  Divider,
} from "@shopify/polaris";
import { CheckIcon, AlertTriangleIcon, ClockIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { createAllMetafieldDefinitions } from "../lib/metafield-definitions";

interface InstallationStatus {
  metafield_definitions: {
    status: 'complete' | 'partial' | 'missing';
    customer_behavior: boolean;
    shop_audiences: boolean;
    shop_theme_blocks: boolean;
    details: string;
  };
  web_pixel: {
    status: 'installed' | 'missing' | 'error';
    pixel_id?: string;
    details: string;
  };
  overall_progress: number;
  ready_for_use: boolean;
}

interface LoaderData {
  installation: InstallationStatus;
}

interface ActionData {
  success?: boolean;
  error?: string;
  action?: string;
}

// Check metafield definitions status
async function checkMetafieldDefinitions(admin: any): Promise<InstallationStatus['metafield_definitions']> {
  try {
    const response = await admin.graphql(`
      query GetMetafieldDefinitions {
        metafieldDefinitions(first: 50, ownerType: CUSTOMER) {
          edges {
            node {
              id
              namespace
              key
              name
              type {
                name
              }
            }
          }
        }
      }
    `);

    const shopResponse = await admin.graphql(`
      query GetShopMetafieldDefinitions {
        metafieldDefinitions(first: 50, ownerType: SHOP) {
          edges {
            node {
              id
              namespace
              key
              name
              type {
                name
              }
            }
          }
        }
      }
    `);

    const data = await response.json();
    const shopData = await shopResponse.json();
    
    const customerDefinitions = data.data.metafieldDefinitions.edges;
    const shopDefinitions = shopData.data.metafieldDefinitions.edges;
    
    
    // Check for required customer metafield definitions
    // Note: Shopify transforms $app:namespace to app--{app_id}--namespace format
    const customerBehavior = customerDefinitions.some((edge: any) => 
      edge.node.namespace.includes('persway_events') && edge.node.key === 'behavior_data'
    );
    
    // Check for required shop metafield definitions
    const shopAudiences = shopDefinitions.some((edge: any) => 
      edge.node.namespace.includes('persway_config') && edge.node.key === 'audiences'
    );
    const shopThemeBlocks = shopDefinitions.some((edge: any) => 
      edge.node.namespace.includes('persway_config') && edge.node.key === 'theme_blocks'
    );

    const completedCount = [customerBehavior, shopAudiences, shopThemeBlocks].filter(Boolean).length;
    
    let status: 'complete' | 'partial' | 'missing';
    let details: string;
    
    if (completedCount === 3) {
      status = 'complete';
      details = 'All metafield definitions are properly configured.';
    } else if (completedCount > 0) {
      status = 'partial';
      details = `${completedCount}/3 metafield definitions configured. Missing: ${
        [
          !customerBehavior && 'Customer Behavior Data',
          !shopAudiences && 'Shop Audience Config',
          !shopThemeBlocks && 'Shop Theme Blocks'
        ].filter(Boolean).join(', ')
      }`;
    } else {
      status = 'missing';
      details = 'No metafield definitions found. Click "Setup Metafields" to create them.';
    }

    
    return {
      status,
      customer_behavior: customerBehavior,
      shop_audiences: shopAudiences,
      shop_theme_blocks: shopThemeBlocks,
      details
    };
  } catch (error) {
    console.error('Error checking metafield definitions:', error);
    return {
      status: 'missing',
      customer_behavior: false,
      shop_audiences: false,
      shop_theme_blocks: false,
      details: `Error checking metafield definitions: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Check Web Pixel installation status
async function checkWebPixelStatus(admin: any): Promise<InstallationStatus['web_pixel']> {
  try {
    const response = await admin.graphql(`
      query {
        webPixel {
          id
          settings
        }
      }
    `);

    const data = await response.json();
    const webPixel = data.data?.webPixel;
    
    if (webPixel?.id) {
      try {
        const settings = JSON.parse(webPixel.settings);
        // Check for our accountID pattern
        if (settings.accountID && settings.accountID.startsWith('persway-')) {
          return {
            status: 'installed',
            pixel_id: webPixel.id,
            details: 'Web Pixel is installed and tracking customer behavior.'
          };
        }
      } catch {
        // Invalid settings JSON, treat as not our pixel
      }
    }
    
    return {
      status: 'missing',
      details: 'Web Pixel not found. Customer behavior tracking is not active.'
    };
  } catch (error) {
    console.error('Error checking Web Pixel status:', error);
    return {
      status: 'error',
      details: 'Error checking Web Pixel status. Please try again.'
    };
  }
}

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const { admin } = await authenticate.admin(request);

  try {
    // Check all installation components
    const [metafieldDefinitions, webPixel] = await Promise.all([
      checkMetafieldDefinitions(admin),
      checkWebPixelStatus(admin)
    ]);

    // Calculate overall progress
    let progress = 0;
    if (metafieldDefinitions.status === 'complete') progress += 60;
    else if (metafieldDefinitions.status === 'partial') progress += 30;
    
    if (webPixel.status === 'installed') progress += 40;

    const readyForUse = metafieldDefinitions.status === 'complete' && webPixel.status === 'installed';

    const installation: InstallationStatus = {
      metafield_definitions: metafieldDefinitions,
      web_pixel: webPixel,
      overall_progress: progress,
      ready_for_use: readyForUse
    };

    return json<LoaderData>({ installation });
  } catch (error) {
    console.error('Installation status check failed:', error);
    
    // Return error state
    const installation: InstallationStatus = {
      metafield_definitions: {
        status: 'missing',
        customer_behavior: false,
        shop_audiences: false,
        shop_theme_blocks: false,
        details: 'Error loading installation status.'
      },
      web_pixel: {
        status: 'error',
        details: 'Error checking Web Pixel status.'
      },
      overall_progress: 0,
      ready_for_use: false
    };

    return json<LoaderData>({ installation });
  }
}

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get('action');

  try {
    if (actionType === 'setup_metafields') {
      try {
        console.log('Action: setup_metafields started');
        // Create metafield definitions
        const result = await createAllMetafieldDefinitions(admin);
        console.log('Metafield creation result:', JSON.stringify(result, null, 2));
        
        if (!result.success) {
          const errors = result.results.filter(r => !r.success).map(r => r.error).join(', ');
          console.log('Metafield creation failed:', errors);
          return json<ActionData>({ 
            error: `Failed to create metafield definitions: ${errors}` 
          });
        }
        
        console.log('Metafield creation successful, redirecting...');
        // Redirect to refresh the page and show updated status
        return redirect('/app/installation');
      } catch (error) {
        console.error('Error in setup_metafields action:', error);
        return json<ActionData>({ 
          error: `Setup metafields failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    }

    if (actionType === 'install_pixel') {
      // Install Web Pixel
      await installWebPixel(admin);
      // Redirect to refresh the page and show updated status
      return redirect('/app/installation');
    }

    return json<ActionData>({ 
      error: 'Unknown action' 
    });
  } catch (error) {
    console.error('Action failed:', error);
    return json<ActionData>({ 
      error: `Action failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
}

// Metafield definitions are now handled by the centralized utility

// Install Web Pixel
async function installWebPixel(admin: any): Promise<void> {
  // Get shop domain for proper pixel configuration
  const shopResponse = await admin.graphql(`
    query { shop { myshopifyDomain } }
  `);
  const shopData = await shopResponse.json();
  const shopDomain = shopData.data?.shop?.myshopifyDomain || 'unknown';
  
  const mutation = `
    mutation webPixelCreate($webPixel: WebPixelInput!) {
      webPixelCreate(webPixel: $webPixel) {
        webPixel {
          id
          settings
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await admin.graphql(mutation, {
    variables: {
      webPixel: {
        settings: JSON.stringify({
          accountID: `persway-${shopDomain}`
        })
      }
    }
  });
  
  const data = await response.json();
  
  if (data.data?.webPixelCreate?.userErrors?.length > 0) {
    const errors = data.data.webPixelCreate.userErrors;
    throw new Error(`Failed to create Web Pixel: ${errors.map((e: any) => e.message).join(', ')}`);
  }
}

export default function Installation() {
  const { installation } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  
  const isSubmitting = navigation.state === 'submitting';
  const submittingAction = navigation.formData?.get('action');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
      case 'installed':
        return <Icon source={CheckIcon} tone="success" />;
      case 'partial':
      case 'pending':
        return <Icon source={ClockIcon} tone="warning" />;
      default:
        return <Icon source={AlertTriangleIcon} tone="critical" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
      case 'installed':
        return <Badge size="small" tone="success">Complete</Badge>;
      case 'partial':
      case 'pending':
        return <Badge size="small" tone="warning">Partial</Badge>;
      default:
        return <Badge size="small" tone="critical">Missing</Badge>;
    }
  };

  return (
    <Page>
      <TitleBar title="App Installation & Setup" />

      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Overall Status Banner */}
            {installation.ready_for_use ? (
              <Banner title="Installation Complete" tone="success">
                Your Persway app is fully configured and ready to use. You can now create audiences and start personalizing your store.
              </Banner>
            ) : (
              <Banner title="Setup Required" tone="warning">
                Complete the setup steps below to start using Persway for store personalization.
              </Banner>
            )}

            {/* Action Results */}
            {actionData?.error && (
              <Banner title="Action Failed" tone="critical">
                {actionData.error}
              </Banner>
            )}

            {/* Progress Overview */}
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Installation Progress
                  </Text>
                  <Text as="p" variant="headingMd">
                    {installation.overall_progress}%
                  </Text>
                </InlineStack>
                <ProgressBar progress={installation.overall_progress} />
                <Text as="p" variant="bodyMd" tone="subdued">
                  {installation.ready_for_use 
                    ? "All components are properly configured."
                    : "Complete the remaining setup steps to finish installation."
                  }
                </Text>
              </BlockStack>
            </Card>

            {/* Installation Steps */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Setup Components
                </Text>

                {/* Metafield Definitions */}
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <InlineStack gap="200">
                      {getStatusIcon(installation.metafield_definitions.status)}
                      <BlockStack gap="100">
                        <Text as="h3" variant="headingSm">
                          Metafield Definitions
                        </Text>
                        <Text as="p" variant="bodyMd" tone="subdued">
                          {installation.metafield_definitions.details}
                        </Text>
                      </BlockStack>
                    </InlineStack>
                    <InlineStack gap="200">
                      {getStatusBadge(installation.metafield_definitions.status)}
                      {installation.metafield_definitions.status !== 'complete' && (
                        <Form method="post">
                          <input type="hidden" name="action" value="setup_metafields" />
                          <Button 
                            variant="primary" 
                            size="slim" 
                            submit
                            loading={isSubmitting && submittingAction === 'setup_metafields'}
                            disabled={isSubmitting}
                          >
                            {isSubmitting && submittingAction === 'setup_metafields' ? 'Setting up...' : 'Setup Metafields'}
                          </Button>
                        </Form>
                      )}
                    </InlineStack>
                  </InlineStack>

                  {/* Metafield Details */}
                  <Layout>
                    <Layout.Section variant="oneHalf">
                      <Card background="bg-surface-secondary">
                        <BlockStack gap="200">
                          <Text as="h4" variant="headingXs">
                            Customer Metafields
                          </Text>
                          <InlineStack gap="200" align="start">
                            {installation.metafield_definitions.customer_behavior ? (
                              <Icon source={CheckIcon} tone="success" />
                            ) : (
                              <Icon source={AlertTriangleIcon} tone="critical" />
                            )}
                            <Text as="p" variant="bodyMd">
                              Behavior Data
                            </Text>
                          </InlineStack>
                        </BlockStack>
                      </Card>
                    </Layout.Section>
                    <Layout.Section variant="oneHalf">
                      <Card background="bg-surface-secondary">
                        <BlockStack gap="200">
                          <Text as="h4" variant="headingXs">
                            Shop Metafields
                          </Text>
                          <InlineStack gap="200" align="start">
                            {installation.metafield_definitions.shop_audiences ? (
                              <Icon source={CheckIcon} tone="success" />
                            ) : (
                              <Icon source={AlertTriangleIcon} tone="critical" />
                            )}
                            <Text as="p" variant="bodyMd">
                              Audience Config
                            </Text>
                          </InlineStack>
                          <InlineStack gap="200" align="start">
                            {installation.metafield_definitions.shop_theme_blocks ? (
                              <Icon source={CheckIcon} tone="success" />
                            ) : (
                              <Icon source={AlertTriangleIcon} tone="critical" />
                            )}
                            <Text as="p" variant="bodyMd">
                              Theme Blocks
                            </Text>
                          </InlineStack>
                        </BlockStack>
                      </Card>
                    </Layout.Section>
                  </Layout>
                </BlockStack>

                <Divider />

                {/* Web Pixel */}
                <InlineStack align="space-between">
                  <InlineStack gap="200">
                    {getStatusIcon(installation.web_pixel.status)}
                    <BlockStack gap="100">
                      <Text as="h3" variant="headingSm">
                        Web Pixel Integration
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {installation.web_pixel.details}
                      </Text>
                      {installation.web_pixel.pixel_id && (
                        <Text as="p" variant="bodyMd" tone="subdued">
                          Pixel ID: {installation.web_pixel.pixel_id}
                        </Text>
                      )}
                    </BlockStack>
                  </InlineStack>
                  <InlineStack gap="200">
                    {getStatusBadge(installation.web_pixel.status)}
                    {installation.web_pixel.status !== 'installed' && (
                      <Form method="post">
                        <input type="hidden" name="action" value="install_pixel" />
                        <Button 
                          variant="primary" 
                          size="slim" 
                          submit
                          loading={isSubmitting && submittingAction === 'install_pixel'}
                          disabled={isSubmitting}
                        >
                          {isSubmitting && submittingAction === 'install_pixel' ? 'Installing...' : 'Install Pixel'}
                        </Button>
                      </Form>
                    )}
                  </InlineStack>
                </InlineStack>

              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            {/* Quick Actions */}
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Quick Actions
                </Text>
                {installation.ready_for_use ? (
                  <BlockStack gap="200">
                    <Button url="/app/audiences" fullWidth variant="primary">
                      Manage Audiences
                    </Button>
                    <Button url="/app/pixel/debug" fullWidth>
                      Debug Web Pixel
                    </Button>
                  </BlockStack>
                ) : (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Complete setup to access app features.
                  </Text>
                )}
              </BlockStack>
            </Card>

            {/* Installation Guide */}
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Installation Guide
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    <strong>Step 1:</strong> Setup metafield definitions to store customer behavior and audience data.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Step 2:</strong> Install the Web Pixel to start tracking customer behavior on your storefront.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Step 3:</strong> Create your first audience to begin personalizing the customer experience.
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}