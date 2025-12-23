
import { json, redirect, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData, useNavigate } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    BlockStack,
    Text,
    Thumbnail,
    InlineStack,
    Button,
    Grid,
    TextField,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useState } from "react";

interface ProductNode {
    id: string;
    title: string;
    featuredImage?: { url: string };
    totalVariants: number;
    handle: string;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);
    const video = await prisma.video.findUnique({
        where: { id: params.id, shop: session.shop },
        include: { products: true }
    });

    if (!video) {
        throw new Response("Not Found", { status: 404 });
    }

    // Fetch product details for the tags
    const productIds = video.products.map(p => p.productId);
    let productsMap: Record<string, ProductNode> = {};

    if (productIds.length > 0) {
        const response = await admin.graphql(
            `query getProducts($ids: [ID!]!) {
            nodes(ids: $ids) {
                ... on Product {
                    id
                    title
                    featuredImage {
                        url
                    }
                    totalVariants
                    handle
                }
            }
        }`,
            { variables: { ids: productIds } }
        );

        const responseJson = await response.json();
        const data = responseJson.data;

        if (data?.nodes) {
            data.nodes.forEach((node: any) => {
                if (node) productsMap[node.id] = node;
            });
        }
    }

    return json({ video, productsMap });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "tag_product") {
        const productsJson = formData.get("products") as string;
        const products = JSON.parse(productsJson);

        for (const p of products) {
            const exists = await prisma.productTag.findFirst({
                where: { videoId: params.id, productId: p.id }
            });
            if (!exists) {
                await prisma.productTag.create({
                    data: {
                        videoId: params.id!,
                        productId: p.id,
                        handle: p.handle,
                        variantId: p.variants?.[0]?.id
                    }
                });
            }
        }
        return json({ status: "success" });
    }

    if (intent === "remove_tag") {
        const tagId = formData.get("tagId") as string;
        await prisma.productTag.deleteMany({
            where: { id: tagId, videoId: params.id }
        });
        return json({ status: "removed" });
    }

    // Handle update video metadata
    const title = formData.get("title") as string;
    const group = formData.get("group") as string;

    await prisma.video.update({
        where: { id: params.id, shop: session.shop },
        data: { title, group }
    });

    return json({ status: "updated" });
};

export default function VideoDetail() {
    const { video, productsMap } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const [title, setTitle] = useState(video.title || "");
    const [group, setGroup] = useState(video.group || "all");

    const handleSave = () => {
        const formData = new FormData();
        formData.append("intent", "update_meta");
        formData.append("title", title);
        formData.append("group", group);
        submit(formData, { method: "post" });
    };

    const selectProduct = async () => {
        const selected = await window.shopify.resourcePicker({ type: "product", multiple: true });
        if (selected) {
            const formData = new FormData();
            formData.append("intent", "tag_product");
            formData.append("products", JSON.stringify(selected));
            submit(formData, { method: "post" });
        }
    };

    return (
        <Page
            breadcrumbs={[{ content: "Videos", url: "/app/videos" }]}
            title={video.title || "Video Detail"}
            primaryAction={{ content: "Save", onAction: handleSave }}
        >
            <Layout>
                <Layout.Section>
                    <Grid>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 8, xl: 8 }}>
                            <Card>
                                <BlockStack gap="400">
                                    <Text variant="headingMd" as="h2">Video Preview</Text>
                                    <div style={{ aspectRatio: '9/16', backgroundColor: '#000', maxWidth: '300px', margin: '0 auto' }}>
                                        <video
                                            src={video.url}
                                            poster={video.thumbnail || undefined}
                                            controls
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                    <TextField
                                        label="Title"
                                        value={title}
                                        onChange={setTitle}
                                        autoComplete="off"
                                    />
                                    <TextField
                                        label="Group (Page Targeting)"
                                        value={group}
                                        onChange={setGroup}
                                        autoComplete="off"
                                        helpText="e.g., 'home', 'product-page'"
                                    />
                                </BlockStack>
                            </Card>
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
                            <Card>
                                <BlockStack gap="400">
                                    <InlineStack align="space-between">
                                        <Text variant="headingMd" as="h2">Tagged Products</Text>
                                        <Button onClick={selectProduct}>Tag Product</Button>
                                    </InlineStack>

                                    {video.products.length === 0 ? (
                                        <Text tone="subdued" as="p">No products tagged yet.</Text>
                                    ) : (
                                        <BlockStack gap="200">
                                            {video.products.map((tag: any) => {
                                                const product = productsMap[tag.productId];
                                                return (
                                                    <InlineStack key={tag.id} gap="300" align="start" blockAlign="center">
                                                        <Thumbnail
                                                            source={product?.featuredImage?.url || ""}
                                                            alt={product?.title || "Product"}
                                                        />
                                                        <div style={{ flex: 1 }}>
                                                            <Text variant="bodyMd" fontWeight="bold" as="p">
                                                                {product ? product.title : "Loading..."}
                                                            </Text>
                                                        </div>
                                                        <Button
                                                            tone="critical"
                                                            variant="plain"
                                                            onClick={() => submit({ intent: 'remove_tag', tagId: tag.id }, { method: 'post' })}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </InlineStack>
                                                );
                                            })}
                                        </BlockStack>
                                    )}
                                </BlockStack>
                            </Card>
                        </Grid.Cell>
                    </Grid>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
