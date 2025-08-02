import { type ActionFunctionArgs, json } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { Page, Layout, Card, Button, Banner, List, Text } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { 
  ALL_METAFIELD_DEFINITIONS,
  CREATE_METAFIELD_DEFINITION,
  GET_METAFIELD_DEFINITIONS,
  formatMetafieldDefinitionInput
} from "../lib/metafield-definitions";

interface SetupResult {
  success: boolean;
  message: string;
  results?: Array<{
    definition: string;
    status: 'created' | 'exists' | 'error';
    error?: string;
  }>;
}

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  const { admin } = await authenticate.admin(request);
  
  const results: SetupResult['results'] = [];
  let allSuccessful = true;

  try {
    // Process each metafield definition
    for (const definition of ALL_METAFIELD_DEFINITIONS) {
      const definitionKey = `${definition.namespace}.${definition.key}`;
      
      try {
        // First check if definition already exists
        const existingResponse = await admin.graphql(GET_METAFIELD_DEFINITIONS, {
          variables: {
            namespace: definition.namespace,
            ownerType: definition.ownerType
          }
        });

        const existingData = await existingResponse.json();
        const existingDefinitions = existingData.data?.metafieldDefinitions?.edges || [];
        
        // Check if our specific key already exists
        const alreadyExists = existingDefinitions.some((edge: any) => 
          edge.node.key === definition.key
        );

        if (alreadyExists) {
          results.push({
            definition: definitionKey,
            status: 'exists'
          });
          continue;
        }

        // Create the metafield definition
        const createResponse = await admin.graphql(CREATE_METAFIELD_DEFINITION, {
          variables: {
            definition: formatMetafieldDefinitionInput(definition)
          }
        });

        const createData = await createResponse.json();
        
        if (createData.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
          const errors = createData.data.metafieldDefinitionCreate.userErrors;
          results.push({
            definition: definitionKey,
            status: 'error',
            error: errors.map((e: any) => e.message).join(', ')
          });
          allSuccessful = false;
        } else {
          results.push({
            definition: definitionKey,
            status: 'created'
          });
        }

      } catch (error) {
        results.push({
          definition: definitionKey,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        allSuccessful = false;
      }
    }

    return json<SetupResult>({
      success: allSuccessful,
      message: allSuccessful 
        ? 'All metafield definitions created successfully!'
        : 'Some metafield definitions failed to create. See details below.',
      results
    });

  } catch (error) {
    return json<SetupResult>({
      success: false,
      message: `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}

export default function SetupPage() {
  const actionData = useActionData<SetupResult>();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'submitting';

  return (
    <Page
      title="Persway Setup"
      subtitle="Initialize metafield definitions required for customer behavior tracking and audience management"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">
                Metafield Definitions Setup
              </Text>
              <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                <Text as="p">
                  This will create the following metafield definitions required for Persway.io:
                </Text>
              </div>
              
              <List type="bullet">
                <List.Item>
                  <strong>Customer Behavior Data</strong> ($app:persway_events.behavior_data) - 
                  Stores customer behavioral events and audience assignments
                </List.Item>
                <List.Item>
                  <strong>Session Migration Data</strong> ($app:persway_session.migration_data) - 
                  Tracks anonymous session data migration
                </List.Item>
                <List.Item>
                  <strong>Audience Definitions</strong> ($app:persway_config.audiences) - 
                  Stores audience rules and configurations
                </List.Item>
                <List.Item>
                  <strong>Theme Block Configurations</strong> ($app:persway_config.theme_blocks) - 
                  Stores personalized content for each audience
                </List.Item>
              </List>

              <div style={{ marginTop: '24px' }}>
                <Form method="post">
                  <Button
                    variant="primary"
                    submit
                    loading={isLoading}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating Definitions...' : 'Initialize Metafield Definitions'}
                  </Button>
                </Form>
              </div>
            </div>
          </Card>
        </Layout.Section>

        {actionData && (
          <Layout.Section>
            <Card>
              <div style={{ padding: '20px' }}>
                <Banner
                  title={actionData.success ? 'Setup Successful' : 'Setup Issues'}
                  status={actionData.success ? 'success' : 'warning'}
                >
                  <p>{actionData.message}</p>
                </Banner>

                {actionData.results && (
                  <div style={{ marginTop: '16px' }}>
                    <Text variant="headingMd" as="h3">
                      Results:
                    </Text>
                    <List type="bullet">
                      {actionData.results.map((result, index) => (
                        <List.Item key={index}>
                          <strong>{result.definition}</strong>: {' '}
                          {result.status === 'created' && <span style={{ color: 'green' }}>✓ Created</span>}
                          {result.status === 'exists' && <span style={{ color: 'orange' }}>⚠ Already exists</span>}
                          {result.status === 'error' && (
                            <span style={{ color: 'red' }}>✗ Error: {result.error}</span>
                          )}
                        </List.Item>
                      ))}
                    </List>
                  </div>
                )}
              </div>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}