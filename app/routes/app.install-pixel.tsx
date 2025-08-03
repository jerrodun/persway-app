import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData, useNavigation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { Card, Page, Button, Banner, Text, BlockStack } from "@shopify/polaris";
import { useState, useEffect } from "react";

// GraphQL mutations for Web Pixel management
const CREATE_WEB_PIXEL = `
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

const GET_WEB_PIXEL = `
  query {
    webPixel {
      id
      settings
    }
  }
`;

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  try {
    // Check if Web Pixel is already installed
    const response = await admin.graphql(GET_WEB_PIXEL);
    const data = await response.json();
    
    const existingPixel = data.data?.webPixel;
    const isPerswayPixel = existingPixel?.settings && 
      (existingPixel.settings.includes('persway') || existingPixel.settings.includes('accountID'));

    return json({
      pixelInstalled: !!isPerswayPixel,
      pixelId: existingPixel?.id || null,
      error: null
    });

  } catch (error) {
    console.error('Error checking Web Pixel status:', error);
    return json({
      pixelInstalled: false,
      pixelId: null,
      error: 'Failed to check Web Pixel status'
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const action = formData.get('action');

    if (action === 'install') {
      // Get shop info and app installation ID
      const appResponse = await admin.graphql(`
        query {
          app {
            installation {
              id
            }
          }
          shop { 
            myshopifyDomain 
          }
        }
      `);
      const appData = await appResponse.json();
      const shopDomain = appData.data?.shop?.myshopifyDomain || 'unknown';
      const appInstallationId = appData.data?.app?.installation?.id;
      
      if (!appInstallationId) {
        return json({
          success: false,
          error: 'Could not find app installation ID'
        });
      }
      
      // Create the Web Pixel with settings matching the extension configuration
      const webPixelInput = {
        settings: JSON.stringify({
          accountID: `persway-${shopDomain}`
        })
      };

      const response = await admin.graphql(CREATE_WEB_PIXEL, {
        variables: { webPixel: webPixelInput }
      });

      const data = await response.json();

      if (data.data?.webPixelCreate?.userErrors?.length > 0) {
        const errors = data.data.webPixelCreate.userErrors;
        return json({
          success: false,
          error: `Failed to create Web Pixel: ${errors.map((e: any) => e.message).join(', ')}`
        });
      }

      if (data.data?.webPixelCreate?.webPixel) {
        return json({
          success: true,
          pixelId: data.data.webPixelCreate.webPixel.id,
          message: 'Web Pixel installed successfully!'
        });
      }

      return json({
        success: false,
        error: 'Unexpected response from Shopify API'
      });

    }

    return json({ success: false, error: 'Invalid action' });

  } catch (error) {
    console.error('Error installing Web Pixel:', error);
    return json({
      success: false,
      error: `Failed to install Web Pixel: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}

export default function InstallPixelPage() {
  const { pixelInstalled, pixelId, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const [showActionResult, setShowActionResult] = useState(false);
  
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData) {
      setShowActionResult(true);
      // Reload the page after successful installation to update status
      if (actionData.success) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    }
  }, [actionData]);

  const handleInstall = () => {
    console.log('Installing Web Pixel...');
    const formData = new FormData();
    formData.append('action', 'install');
    submit(formData, { method: 'post' });
  };

  return (
    <Page title="Web Pixel Installation">
      <BlockStack gap="500">
        {error && (
          <Banner status="critical">
            <Text as="p">{error}</Text>
          </Banner>
        )}
        
        {showActionResult && actionData && (
          <Banner status={actionData.success ? "success" : "critical"}>
            <Text as="p">{actionData.success ? actionData.message : actionData.error}</Text>
          </Banner>
        )}

        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h2">
              Persway Web Pixel Status
            </Text>
            
            {pixelInstalled ? (
              <Banner status="success">
                <Text as="p">
                  ✅ Web Pixel is installed and active (ID: {pixelId})
                </Text>
              </Banner>
            ) : (
              <Banner status="warning">
                <Text as="p">
                  ⚠️ Web Pixel is not installed. Customer behavior tracking will not work.
                </Text>
              </Banner>
            )}

            <Text as="p">
              The Web Pixel extension is required to track customer behavior events like page views, 
              product views, cart actions, and search queries. This data is used for audience assignment 
              and personalization.
            </Text>

            {!pixelInstalled && (
              <Button primary onClick={handleInstall} loading={isSubmitting}>
                {isSubmitting ? "Installing..." : "Install Web Pixel"}
              </Button>
            )}

            <Text variant="bodySm" as="p" tone="subdued">
              Note: After installation, the Web Pixel will automatically load on all store pages 
              and begin tracking customer events. No additional configuration is required.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}