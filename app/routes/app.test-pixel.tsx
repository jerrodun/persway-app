import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, useActionData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { Card, Page, Button, Banner, Text, BlockStack } from "@shopify/polaris";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  
  // Test basic GraphQL access
  try {
    const response = await admin.graphql(`
      query {
        shop {
          name
          id
        }
      }
    `);
    const data = await response.json();
    
    return json({
      shopName: data.data?.shop?.name || 'Unknown',
      shopId: data.data?.shop?.id || 'Unknown',
      error: null
    });
  } catch (error) {
    return json({
      shopName: 'Error',
      shopId: 'Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get('action');
  
  console.log('Test action received:', action);
  
  if (action === 'test-pixels') {
    try {
      // Use singular webPixel query (no parameters returns first/existing pixel)
      const queryResponse = await admin.graphql(`
        query {
          webPixel {
            id
            settings
          }
        }
      `);
      
      const queryData = await queryResponse.json();
      console.log('Web Pixel query result:', JSON.stringify(queryData, null, 2));
      
      if (queryData.errors) {
        return json({
          success: false,
          message: `Query Error: ${queryData.errors[0].message}`,
          data: queryData
        });
      }
      
      return json({
        success: true,
        message: 'Successfully queried web pixel',
        data: queryData
      });
      
    } catch (error) {
      console.error('Test error:', error);
      return json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null
      });
    }
  }
  
  if (action === 'create-pixel') {
    try {
      // Get shop domain for account ID
      const shopResponse = await admin.graphql(`
        query { shop { myshopifyDomain } }
      `);
      const shopData = await shopResponse.json();
      const shopDomain = shopData.data?.shop?.myshopifyDomain || 'unknown';
      
      // Try to create a web pixel with correct settings format
      const createResponse = await admin.graphql(`
        mutation webPixelCreate($webPixel: WebPixelInput!) {
          webPixelCreate(webPixel: $webPixel) {
            webPixel {
              id
              settings
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `, {
        variables: {
          webPixel: {
            settings: JSON.stringify({
              accountID: `persway-${shopDomain}`
            })
          }
        }
      });
      
      const createData = await createResponse.json();
      console.log('Create pixel result:', JSON.stringify(createData, null, 2));
      
      if (createData.errors) {
        return json({
          success: false,
          message: `Mutation Error: ${createData.errors[0].message}`,
          data: createData
        });
      }
      
      if (createData.data?.webPixelCreate?.userErrors?.length > 0) {
        const userError = createData.data.webPixelCreate.userErrors[0];
        
        // If pixel already exists, suggest using update instead
        if (userError.code === 'TAKEN') {
          return json({
            success: false,
            message: `Web Pixel already exists: ${userError.message}. Try the Update button instead.`,
            data: createData
          });
        }
        
        return json({
          success: false,
          message: `User Error: ${userError.message}`,
          data: createData
        });
      }
      
      return json({
        success: true,
        message: 'Successfully created web pixel!',
        data: createData
      });
      
    } catch (error) {
      console.error('Create error:', error);
      return json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null
      });
    }
  }
  
  if (action === 'update-pixel') {
    try {
      // First, get the existing pixel ID
      const queryResponse = await admin.graphql(`
        query {
          webPixel {
            id
            settings
          }
        }
      `);
      
      const queryData = await queryResponse.json();
      
      if (queryData.errors || !queryData.data?.webPixel?.id) {
        return json({
          success: false,
          message: 'No existing Web Pixel found to update',
          data: queryData
        });
      }
      
      const pixelId = queryData.data.webPixel.id;
      
      // Get shop domain for account ID
      const shopResponse = await admin.graphql(`
        query { shop { myshopifyDomain } }
      `);
      const shopData = await shopResponse.json();
      const shopDomain = shopData.data?.shop?.myshopifyDomain || 'unknown';
      
      // Update the web pixel settings
      const updateResponse = await admin.graphql(`
        mutation webPixelUpdate($id: ID!, $webPixel: WebPixelInput!) {
          webPixelUpdate(id: $id, webPixel: $webPixel) {
            webPixel {
              id
              settings
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `, {
        variables: {
          id: pixelId,
          webPixel: {
            settings: JSON.stringify({
              accountID: `persway-${shopDomain}`
            })
          }
        }
      });
      
      const updateData = await updateResponse.json();
      console.log('Update pixel result:', JSON.stringify(updateData, null, 2));
      
      if (updateData.errors) {
        return json({
          success: false,
          message: `Update Error: ${updateData.errors[0].message}`,
          data: updateData
        });
      }
      
      if (updateData.data?.webPixelUpdate?.userErrors?.length > 0) {
        return json({
          success: false,
          message: `User Error: ${updateData.data.webPixelUpdate.userErrors[0].message}`,
          data: updateData
        });
      }
      
      return json({
        success: true,
        message: `Successfully updated web pixel ${pixelId}!`,
        data: updateData
      });
      
    } catch (error) {
      console.error('Update error:', error);
      return json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null
      });
    }
  }
  
  return json({ success: false, message: 'Invalid action', data: null });
}

export default function TestPixelPage() {
  const { shopName, shopId, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  
  return (
    <Page title="Web Pixel API Test">
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h2">Shop Info</Text>
            <Text as="p">Shop Name: {shopName}</Text>
            <Text as="p">Shop ID: {shopId}</Text>
            {error && <Text as="p" tone="critical">Error: {error}</Text>}
          </BlockStack>
        </Card>
        
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h2">Test Web Pixel API</Text>
            
            <BlockStack gap="300">
              <Form method="post">
                <input type="hidden" name="action" value="test-pixels" />
                <Button submit>
                  Test Query Web Pixel
                </Button>
              </Form>
              
              <Form method="post">
                <input type="hidden" name="action" value="create-pixel" />
                <Button submit primary>
                  Test Create Web Pixel
                </Button>
              </Form>
              
              <Form method="post">
                <input type="hidden" name="action" value="update-pixel" />
                <Button submit tone="critical">
                  Test Update Web Pixel
                </Button>
              </Form>
            </BlockStack>
            
            {actionData && (
              <Banner status={actionData.success ? "success" : "critical"}>
                <Text as="p">{actionData.message}</Text>
                {actionData.data && (
                  <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                    {JSON.stringify(actionData.data, null, 2)}
                  </pre>
                )}
              </Banner>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}