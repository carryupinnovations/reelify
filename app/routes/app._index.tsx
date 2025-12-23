
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  BlockStack,
  Card,
  Text,
  Button,
  InlineStack,
  Divider,
  CalloutCard,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const videoCount = await prisma.video.count({
    where: { shop: session.shop }
  });

  return json({ videoCount });
};

export default function Index() {
  const { videoCount } = useLoaderData();

  return (
    <Page title="Dashboard">
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <CalloutCard
              title="Make your videos shoppable"
              illustration="https://cdn.shopify.com/s/files/1/0583/6465/7734/files/tag.png?v=1705280535"
              primaryAction={{
                content: 'Add New Video',
                url: '/app/videos/new',
              }}
            >
              <p>
                Transform your existing social media content into sales channels.
                Upload videos, tag products, and display them on your storefront.
              </p>
            </CalloutCard>

            <div style={{ marginTop: '20px' }}>
              <Text variant="headingMd" as="h2">Overview</Text>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '10px' }}>
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">Total Videos</Text>
                    <Text variant="headingXl" as="p">{videoCount}</Text>
                  </BlockStack>
                </Card>
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">Total Views</Text>
                    <Text variant="headingXl" as="p">0</Text>
                    <Text tone="subdued" as="span">Analytics coming soon</Text>
                  </BlockStack>
                </Card>
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">Engagement</Text>
                    <Text variant="headingXl" as="p">0%</Text>
                    <Text tone="subdued" as="span">Click-through rate</Text>
                  </BlockStack>
                </Card>
              </div>
            </div>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Quick Links</Text>
                <BlockStack gap="100">
                  <Button variant="plain" url="/app/videos" textAlign="start">Manage Videos</Button>
                  <Button variant="plain" url="/app/widgets" textAlign="start">Configure Widgets</Button>
                  <Button variant="plain" url="/app/pricing" textAlign="start">Billing & Plans</Button>
                </BlockStack>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Help & Support</Text>
                <p>Need help getting started? Check our documentation or contact support.</p>
                <Button url="#">View Documentation</Button>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
