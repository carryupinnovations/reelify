
import { json } from "@remix-run/node";
import { useLoaderData, Link, Form } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    Button,
    BlockStack,
    Text,
    EmptyState,
    Thumbnail,
    InlineStack,
    Badge,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
    const { admin } = await authenticate.admin(request);
    const videos = await prisma.video.findMany({
        orderBy: { createdAt: "desc" },
        include: { products: true }
    });
    return json({ videos });
};

export default function Videos() {
    const { videos } = useLoaderData();

    const emptyStateMarkup = (
        <EmptyState
            heading="Upload a video to get started"
            action={{
                content: "Add Video",
                url: "/app/videos/new",
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
            <p>Allow customers to shop directly from your videos.</p>
        </EmptyState>
    );

    return (
        <Page
            title="Videos"
            primaryAction={{ content: "Add Video", url: "/app/videos/new" }}
        >
            <Layout>
                <Layout.Section>
                    {videos.length === 0 ? (
                        <Card padding="0">
                            {emptyStateMarkup}
                        </Card>
                    ) : (
                        <BlockStack gap="400">
                            {videos.map((video) => (
                                <Card key={video.id}>
                                    <BlockStack gap="200">
                                        <InlineStack gap="400" align="start" blockAlign="center">
                                            <Thumbnail
                                                source={video.thumbnail || "https://placeholder.co/100x100"}
                                                alt={video.title}
                                                size="large"
                                            />
                                            <BlockStack gap="100">
                                                <Text variant="headingMd" as="h3">
                                                    {video.title || "Untitled Video"}
                                                </Text>
                                                <Text variant="bodySm" as="p" color="subdued">
                                                    {video.products.length} products tagged
                                                </Text>
                                                <InlineStack gap="200">
                                                    <Button url={`/app/videos/${video.id}`}>Edit</Button>
                                                    <Form method="post" action={`/app/videos/${video.id}/delete`}>
                                                        <Button submit tone="critical" variant="plain">Delete</Button>
                                                    </Form>
                                                </InlineStack>
                                            </BlockStack>
                                        </InlineStack>
                                    </BlockStack>
                                </Card>
                            ))}
                        </BlockStack>
                    )}
                </Layout.Section>
            </Layout>
        </Page>
    );
}
