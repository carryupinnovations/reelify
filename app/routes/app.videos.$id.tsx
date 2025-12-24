
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigate, useNavigation, useRouteError } from "@remix-run/react";
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
    Banner,
    Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useState } from "react";

interface ProductNode {
    id: string;
    title: string;
    featuredImage?: { url: string };
    handle: string;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    console.log("loader hit for id:", params.id);
    const { admin, session } = await authenticate.admin(request);

    // 1. Fetch Video
    const video = await prisma.video.findUnique({
        where: { id: params.id, shop: session.shop },
        include: { products: true }
    });

    if (!video) {
        console.error("Video not found in DB");
        throw new Response("Video Not Found", { status: 404 });
    }

    // 2. Fetch Tagged Product Details
    const productIds = video.products.map(p => p.productId);
    let taggedProductsMap: Record<string, ProductNode> = {};

    if (productIds.length > 0) {
        try {
            const response = await admin.graphql(
                `query getProducts($ids: [ID!]!) {
                    nodes(ids: $ids) {
                        ... on Product {
                            id
                            title
                            featuredImage {
                                url
                            }
                            handle
                        }
                    }
                }`,
                { variables: { ids: productIds } }
            );

            const responseJson = await response.json();
            const nodes = responseJson.data?.nodes || [];
            nodes.forEach((node: any) => {
                if (node) taggedProductsMap[node.id] = node;
            });
        } catch (e) {
            console.error("GraphQL error fetching products:", e);
        }
    }

    const host = new URL(request.url).searchParams.get("host");

    return json({
        video,
        taggedProductsMap,
        shop: session.shop,
        host
    });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "tag_product") {
        const productId = formData.get("productId") as string;
        const handle = formData.get("handle") as string;
        const variantId = formData.get("variantId") as string;

        const exists = await prisma.productTag.findFirst({
            where: { videoId: params.id, productId }
        });

        if (!exists) {
            await prisma.productTag.create({
                data: {
                    videoId: params.id!,
                    productId,
                    handle: handle || "",
                    variantId: variantId || ""
                }
            });
        }
    } else if (intent === "remove_tag") {
        const tagId = formData.get("tagId") as string;
        await prisma.productTag.deleteMany({
            where: { id: tagId, videoId: params.id }
        });
    } else {
        const title = formData.get("title") as string;
        const group = formData.get("group") as string;
        await prisma.video.update({
            where: { id: params.id, shop: session.shop },
            data: { title, group }
        });
    }

    return json({ success: true });
};

export default function VideoDetail() {
    const { video, taggedProductsMap, shop, host } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const navigate = useNavigate();
    const navigation = useNavigation();

    const [title, setTitle] = useState(video.title || "");
    const [group, setGroup] = useState(video.group || "all");

    const isLoading = navigation.state !== "idle";

    const searchParams = new URLSearchParams();
    if (shop) searchParams.set("shop", shop);
    if (host) searchParams.set("host", host);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : "";

    const handleSave = () => {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("group", group);
        submit(formData, { method: "post" });
    };

    const openResourcePicker = async () => {
        try {
            const selected = await window.shopify.resourcePicker({
                type: "product",
                multiple: true,
            });

            if (selected && selected.selection.length > 0) {
                // Submit each selected product
                for (const product of selected.selection) {
                    const formData = new FormData();
                    formData.append("intent", "tag_product");
                    formData.append("productId", product.id);
                    formData.append("handle", product.handle);
                    formData.append("variantId", product.variants?.[0]?.id || "");
                    submit(formData, { method: "post" });
                }
            }
        } catch (e) {
            console.error("Resource picker error:", e);
        }
    };

    return (
        <Page
            backAction={{ content: "Videos", url: `/app/videos${queryString}` }}
            title={video.title || "Video Detail"}
            primaryAction={{ content: "Save", onAction: handleSave, loading: isLoading }}
        >
            <Layout>
                <Layout.Section>
                    <Grid>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 8, xl: 8 }}>
                            <Card>
                                <BlockStack gap="400">
                                    <Text variant="headingMd" as="h2">Video Preview</Text>
                                    <div style={{ aspectRatio: '9/16', backgroundColor: '#000', maxWidth: '300px', margin: '0 auto', borderRadius: '8px', overflow: 'hidden' }}>
                                        <video
                                            src={video.url}
                                            poster={video.thumbnail || undefined}
                                            controls
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                    <TextField label="Title" value={title} onChange={setTitle} autoComplete="off" />
                                    <TextField label="Group" value={group} onChange={setGroup} autoComplete="off" helpText="Page targeting like 'home' or 'product'" />
                                </BlockStack>
                            </Card>
                        </Grid.Cell>

                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
                            <Card>
                                <BlockStack gap="400">
                                    <InlineStack align="space-between">
                                        <Text variant="headingMd" as="h2">Products</Text>
                                        <Button variant="primary" onClick={openResourcePicker}>
                                            Tag Product
                                        </Button>
                                    </InlineStack>

                                    {video.products.length === 0 ? (
                                        <Banner tone="info"><p>Click 'Tag Product' to start</p></Banner>
                                    ) : (
                                        <BlockStack gap="200">
                                            {video.products.map((tag: any) => {
                                                const product = taggedProductsMap[tag.productId];
                                                return (
                                                    <Box key={tag.id} padding="300" background="bg-surface-secondary" borderRadius="200">
                                                        <InlineStack gap="300" align="start" blockAlign="center">
                                                            <Thumbnail
                                                                source={product?.featuredImage?.url || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"}
                                                                alt={product?.title || "Product"}
                                                                size="small"
                                                            />
                                                            <div style={{ flex: 1 }}><Text variant="bodyMd" fontWeight="bold" as="p">{product?.title || "Loading..."}</Text></div>
                                                            <Button tone="critical" variant="plain" onClick={() => submit({ intent: 'remove_tag', tagId: tag.id }, { method: 'post' })}>
                                                                Remove
                                                            </Button>
                                                        </InlineStack>
                                                    </Box>
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

export function ErrorBoundary() {
    const error: any = useRouteError();
    return (
        <Page title="Loading Error">
            <Card>
                <Banner tone="critical">
                    <Text as="h2">Could not load video detail</Text>
                    <p>{error?.message || "Verify the video exists and try again."}</p>
                    <Button url="/app/videos">Back to Library</Button>
                </Banner>
            </Card>
        </Page>
    );
}

declare global {
    interface Window {
        shopify: {
            resourcePicker: (options: any) => Promise<any>;
        };
    }
}
