
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  BlockStack,
  Card,
  Text,
  Button,
  InlineStack,
  Banner,
  Badge,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Get video count
  const videoCount = await prisma.video.count({
    where: { shop: session.shop }
  });

  return json({
    videoCount,
    shop: session.shop,
    appUrl: process.env.SHOPIFY_APP_URL || "",
    analytics: {
      views: 0,
      revenue: 0,
      orders: 0,
      itemsSold: 0,
      roi: 0,
      reelupViews: 0,
      reelupRevenue: 0,
      reelupOrders: 0,
    }
  });
};

export default function Index() {
  const { videoCount, shop, analytics, appUrl } = useLoaderData<typeof loader>();

  // Extract store name from shop domain
  const storeName = shop.split('.')[0];
  const displayName = storeName.charAt(0).toUpperCase() + storeName.slice(1);

  // For now, we'll assume app embed is not active (you can enhance this later)
  const isAppEmbedActive = false;

  const handleActivateEmbed = () => {
    // Open theme customizer
    window.open(`https://${shop}/admin/themes/current/editor?context=apps`, '_top');
  };

  return (
    <Page title={`Hi! - ${displayName} -`}>
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Welcome Message */}
            <Text variant="headingMd" as="h2">
              Welcome to Reelify! Here's how videos are performing in the last 30 days
            </Text>

            {/* App Embed Status Banner */}
            {!isAppEmbedActive && (
              <Banner
                tone="warning"
                title="Reelify has not been active on your live theme"
              >
                <Box paddingBlockStart="200">
                  <BlockStack gap="300">
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" fontWeight="semibold">App Embed</Text>
                      <Badge tone="success">Active on duplicate theme</Badge>
                    </InlineStack>
                    <Text as="p" tone="subdued">
                      Reelify widgets will not be visible when the app embed is inactive
                    </Text>
                    <Button onClick={handleActivateEmbed}>Activate</Button>
                  </BlockStack>
                </Box>
              </Banner>
            )}

            {isAppEmbedActive && (
              <Banner tone="success" title="Reelify is active on your live theme">
                <Text as="p">Your shoppable videos are live and ready to drive sales!</Text>
              </Banner>
            )}

            {/* NEW: Setup Guide Card */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">🚀 Quick Setup: Storefront Widget</Text>
                <Text as="p">
                  To display your videos on your website, copy the **App Base URL** below and paste it into the "App Base URL" field in your Theme Editor:
                </Text>
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <code style={{ fontSize: '14px', color: '#005bd3' }}>{appUrl}</code>
                    <Button onClick={() => {
                      navigator.clipboard.writeText(appUrl);
                      alert("App Base URL copied to clipboard!");
                    }} size="slim" variant="secondary">Copy URL</Button>
                  </InlineStack>
                </Box>
                <Text variant="bodySm" tone="subdued" as="p">
                  Note: This URL may change when you restart your development environment.
                </Text>
                <Button onClick={handleActivateEmbed} variant="primary">Open Theme Editor</Button>
              </BlockStack>
            </Card>

            {/* Top Metrics - Last 30 Days */}
            <Card>
              <BlockStack gap="400">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px'
                }}>
                  <div>
                    <Text variant="headingSm" as="h3" tone="subdued">Reelify views</Text>
                    <Text variant="heading2xl" as="p" fontWeight="bold">
                      {analytics.reelupViews}
                    </Text>
                  </div>
                  <div>
                    <Text variant="headingSm" as="h3" tone="subdued">Reelify revenue</Text>
                    <Text variant="heading2xl" as="p" fontWeight="bold">
                      ${analytics.reelupRevenue.toFixed(2)}
                    </Text>
                  </div>
                  <div>
                    <Text variant="headingSm" as="h3" tone="subdued">Reelify orders</Text>
                    <Text variant="heading2xl" as="p" fontWeight="bold">
                      {analytics.reelupOrders}
                    </Text>
                  </div>
                </div>
              </BlockStack>
            </Card>

            {/* Detailed Analytics */}
            <Card>
              <BlockStack gap="400">
                <Text variant="bodyMd" as="p" tone="subdued">
                  Total number of times your videos have been viewed since installation.
                </Text>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '20px',
                  paddingTop: '12px'
                }}>
                  <div>
                    <Text variant="headingSm" as="h3" tone="subdued">Views</Text>
                    <Text variant="headingXl" as="p" fontWeight="bold">
                      {analytics.views.toLocaleString()}
                    </Text>
                  </div>
                  <div>
                    <Text variant="headingSm" as="h3" tone="subdued">Revenue</Text>
                    <Text variant="headingXl" as="p" fontWeight="bold">
                      ${analytics.revenue.toFixed(2)}
                    </Text>
                  </div>
                  <div>
                    <Text variant="headingSm" as="h3" tone="subdued">Items sold</Text>
                    <Text variant="headingXl" as="p" fontWeight="bold">
                      {analytics.itemsSold}
                    </Text>
                  </div>
                  <div>
                    <Text variant="headingSm" as="h3" tone="subdued">ROI</Text>
                    <Text variant="headingXl" as="p" fontWeight="bold">
                      {analytics.roi.toFixed(2)}%
                    </Text>
                  </div>
                </div>
              </BlockStack>
            </Card>

            {/* Quick Actions */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Quick Actions</Text>
                <InlineStack gap="300">
                  <Button url="/app/videos/new" variant="primary">
                    Upload New Video
                  </Button>
                  <Button url="/app/videos">
                    Manage Videos ({videoCount.toString()})
                  </Button>
                  <Button url="/app/widgets">
                    Configure Widgets
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        {/* Sidebar */}
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">Getting Started</Text>
                <BlockStack gap="200">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: videoCount > 0 ? '#008060' : '#E4E5E7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px'
                    }}>
                      {videoCount > 0 ? '✓' : '1'}
                    </div>
                    <Text as="span">Upload your first video</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#E4E5E7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px'
                    }}>
                      2
                    </div>
                    <Text as="span">Tag products in your video</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: isAppEmbedActive ? '#008060' : '#E4E5E7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px'
                    }}>
                      {isAppEmbedActive ? '✓' : '3'}
                    </div>
                    <Text as="span">Activate app embed</Text>
                  </div>
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">Resources</Text>
                <BlockStack gap="200">
                  <Button variant="plain" url="#" textAlign="start">
                    📚 Documentation
                  </Button>
                  <Button variant="plain" url="#" textAlign="start">
                    🎥 Video Tutorials
                  </Button>
                  <Button variant="plain" url="#" textAlign="start">
                    💬 Contact Support
                  </Button>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
