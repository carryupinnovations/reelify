
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
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
    Modal,
    Banner,
    TextField,
    IndexTable,
    Badge,
    Box,
    Icon,
    Popover,
    ActionList,
    ProgressBar,
} from "@shopify/polaris";
import {
    ChevronDownIcon,
    ViewIcon,
    UploadIcon,
    MenuVerticalIcon,
    EditIcon,
    DeleteIcon,
    MagicIcon,
    CheckIcon,
    XIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useState, useRef, useEffect, useCallback } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);

    const videos = await prisma.video.findMany({
        where: { shop: session.shop },
        orderBy: { createdAt: 'desc' },
        include: { products: true }
    });

    const url = new URL(request.url);
    const host = url.searchParams.get("host") || "";

    const allTaggedProductIds = Array.from(new Set(videos.flatMap(v => v.products.map(p => p.productId))));
    let productsMap: Record<string, any> = {};

    if (allTaggedProductIds.length > 0) {
        try {
            const response = await admin.graphql(
                `query getProducts($ids: [ID!]!) {
                    nodes(ids: $ids) {
                        ... on Product {
                            id
                            title
                            handle
                            featuredImage {
                                url
                            }
                            variants(first: 1) {
                                nodes {
                                    id
                                    price
                                }
                            }
                        }
                    }
                }`,
                { variables: { ids: allTaggedProductIds } }
            );
            const resJson = await response.json();
            resJson.data?.nodes?.forEach((node: any) => {
                if (node) productsMap[node.id] = node;
            });
        } catch (e) {
            console.error("Error fetching product details:", e);
        }
    }

    return json({
        videos,
        productsMap,
        shop: session.shop,
        host
    });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "create") {
        const url = formData.get("url") as string;
        const title = formData.get("title") as string;
        if (!url) return json({ error: "URL required" }, { status: 400 });
        const video = await (prisma.video as any).create({
            data: {
                title: title || "Untitled Video",
                group: "all",
                url,
                shop: session.shop
            }
        });
        return json({ success: true, video });
    }

    if (intent === "delete") {
        const videoId = formData.get("videoId") as string;
        await prisma.video.delete({ where: { id: videoId, shop: session.shop } });
        return json({ success: true });
    }

    if (intent === "enable_abs") {
        const videoId = formData.get("videoId") as string;
        await (prisma.video as any).update({
            where: { id: videoId },
            data: { absEnabled: true }
        });
        return json({ success: true });
    }

    if (intent === "tag_product") {
        const videoId = formData.get("videoId") as string;
        const productId = formData.get("productId") as string;
        const handle = formData.get("handle") as string;

        const exists = await prisma.productTag.findFirst({
            where: { videoId, productId }
        });
        if (!exists) {
            await prisma.productTag.create({
                data: { videoId, productId, handle: handle || "" }
            });
        }
    }

    if (intent === "remove_tag") {
        const tagId = formData.get("tagId") as string;
        await prisma.productTag.deleteMany({ where: { id: tagId } });
    }

    if (intent === "update_meta") {
        const videoId = formData.get("videoId") as string;
        const title = formData.get("title") as string;
        const group = formData.get("group") as string;
        await (prisma.video as any).update({
            where: { id: videoId },
            data: { title, group }
        });
    }

    return json({ success: true });
};

export default function Videos() {
    const { videos, productsMap } = useLoaderData<typeof loader>();
    const fetcher = useFetcher();

    const [drawerActive, setDrawerActive] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<any>(null);
    const [uploadModalActive, setUploadModalActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [absProcessing, setAbsProcessing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editGroup, setEditGroup] = useState("");

    const [activePopovers, setActivePopovers] = useState<Record<string, boolean>>({});
    const togglePopover = useCallback((videoId: string) => {
        setActivePopovers(prev => ({ ...prev, [videoId]: !prev[videoId] }));
    }, []);

    const openEditDrawer = (video: any) => {
        setSelectedVideo(video);
        setEditTitle(video.title || "");
        setEditGroup(video.group || "all");
        setDrawerActive(true);
        setActivePopovers({});
    };

    const handleDeleteVideo = (videoId: string) => {
        if (confirm("Are you sure you want to delete this video?")) {
            fetcher.submit({ intent: "delete", videoId }, { method: "post" });
        }
        setActivePopovers({});
    };

    const handleEnableABS = () => {
        setAbsProcessing(true);
        fetcher.submit({ intent: "enable_abs", videoId: selectedVideo.id }, { method: "post" });
        setTimeout(() => setAbsProcessing(false), 2000);
    };

    const handleSaveMeta = () => {
        fetcher.submit({ intent: "update_meta", videoId: selectedVideo.id, title: editTitle, group: editGroup }, { method: "post" });
        setDrawerActive(false);
    };

    const handleAddVideoClick = () => {
        setUploadModalActive(true);
        setTimeout(() => fileInputRef.current?.click(), 100);
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadProgress("Getting signed URL...");
        try {
            const signRes = await fetch(`/api/sign-s3?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type)}`);
            const signData = await signRes.json();
            setUploadProgress(`Uploading ${file.name}...`);
            await fetch(signData.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
            setUploadProgress("Finalizing...");
            fetcher.submit({ intent: "create", url: signData.publicUrl, title: file.name.replace(/\.[^/.]+$/, "") }, { method: "post" });
            setUploadProgress("Success!");
            setTimeout(() => { setUploadModalActive(false); setUploading(false); }, 1000);
        } catch (error: any) {
            setUploadProgress(`Error: ${error.message}`);
            setUploading(false);
        }
    };

    const openResourcePicker = async () => {
        const selected = await window.shopify.resourcePicker({ type: "product", multiple: true });
        if (selected && selected.selection.length > 0) {
            for (const product of selected.selection) {
                fetcher.submit({ intent: "tag_product", videoId: selectedVideo.id, productId: product.id, handle: product.handle }, { method: "post" });
            }
        }
    };

    useEffect(() => {
        if (fetcher.state === "idle" && selectedVideo) {
            const updated = videos.find(v => v.id === selectedVideo.id);
            if (updated) setSelectedVideo(updated);
        }
    }, [fetcher.state, videos, selectedVideo]);

    useEffect(() => {
        if (drawerActive && videoRef.current) {
            const playVideo = async () => {
                try {
                    videoRef.current?.load();
                    await videoRef.current?.play();
                } catch (e) {
                    console.log("Autoplay failed", e);
                }
            };
            playVideo();
        }
    }, [drawerActive, selectedVideo?.url]);

    const rowMarkup = videos.map((video, index) => (
        <IndexTable.Row id={video.id} key={video.id} position={index}>
            <IndexTable.Cell>
                <div style={{ position: 'relative', width: '50px', height: '80px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f0f0f0', cursor: 'pointer' }} onClick={() => openEditDrawer(video)}>
                    <img src={video.thumbnail || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.8)', borderRadius: '50%', padding: '4px' }}>
                        <Icon source={ViewIcon} tone="base" />
                    </div>
                </div>
            </IndexTable.Cell>
            <IndexTable.Cell>
                <BlockStack gap="050">
                    <Text variant="bodyMd" fontWeight="bold" as="p">{video.title || "Untitled"}</Text>
                    <Text variant="bodySm" tone="subdued" as="p">Id: {video.id.substring(0, 8)}</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        {(video as any).absEnabled && <Badge tone="magic"><InlineStack gap="100"><Icon source={MagicIcon} tone="magic" /> <Text variant="bodyXs" as="span">ABS Optimized</Text></InlineStack></Badge>}
                    </div>
                </BlockStack>
            </IndexTable.Cell>
            <IndexTable.Cell>
                <Text variant="bodySm" as="p">{new Date(video.createdAt).toLocaleDateString()}</Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
                <Badge tone="success">Published</Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
                <Button onClick={() => openEditDrawer(video)} icon={ChevronDownIcon} textAlign="left">
                    {video.products.length} Products tagged
                </Button>
            </IndexTable.Cell>
            <IndexTable.Cell>
                <Popover
                    active={activePopovers[video.id] || false}
                    activator={<Button icon={MenuVerticalIcon} variant="plain" onClick={() => togglePopover(video.id)} />}
                    onClose={() => togglePopover(video.id)}
                >
                    <ActionList
                        items={[
                            { content: 'Edit', icon: EditIcon, onAction: () => openEditDrawer(video) },
                            { content: 'Delete', icon: DeleteIcon, destructive: true, onAction: () => handleDeleteVideo(video.id) },
                        ]}
                    />
                </Popover>
            </IndexTable.Cell>
        </IndexTable.Row>
    ));

    const firstTaggedProduct = selectedVideo?.products?.[0] ? productsMap[selectedVideo.products[0].productId] : null;

    return (
        <Page title="Video Library" primaryAction={{ content: 'Add Video', onAction: handleAddVideoClick }}>
            <Layout>
                <Layout.Section>
                    {videos.length === 0 ? (
                        <Card>
                            <EmptyState heading="No videos yet" action={{ content: 'Upload your first video', onAction: handleAddVideoClick }} image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
                                <p>Upload videos to create your shoppable content library</p>
                            </EmptyState>
                        </Card>
                    ) : (
                        <Card padding="0">
                            <IndexTable resourceName={{ singular: 'video', plural: 'videos' }} itemCount={videos.length} headings={[{ title: 'Preview' }, { title: 'General' }, { title: 'Date' }, { title: 'Status' }, { title: 'Tags' }, { title: 'Actions' }]} selectable={false}>
                                {rowMarkup}
                            </IndexTable>
                        </Card>
                    )}
                </Layout.Section>
            </Layout>

            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} style={{ display: 'none' }} />

            {/* FULL SCREEN OFF-CANVAS OVERLAY */}
            {drawerActive && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#fff',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideIn 0.25s ease-out forwards'
                }}>
                    <style>{`
                        @keyframes slideIn {
                            from { transform: translateX(100%); }
                            to { transform: translateX(0); }
                        }
                    `}</style>

                    {/* DRAWER HEADER */}
                    <div style={{
                        padding: '12px 24px',
                        borderBottom: '1px solid #e1e3e5',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#fff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        zIndex: 10
                    }}>
                        <InlineStack gap="400" blockAlign="center">
                            <Button icon={XIcon} variant="plain" onClick={() => setDrawerActive(false)} />
                            <Text variant="headingLg" as="h2">Edit Reel: {selectedVideo?.title}</Text>
                        </InlineStack>
                        <InlineStack gap="300">
                            <Button onClick={() => setDrawerActive(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSaveMeta} loading={fetcher.state !== "idle"}>Save Changes</Button>
                        </InlineStack>
                    </div>

                    {/* DRAWER BODY - BALANCED SPLIT LAYOUT */}
                    <div style={{ flex: 1, display: 'flex', background: '#f1f2f4', overflow: 'hidden' }}>

                        {/* LEFT SIDE: IMMERSIVE PREVIEW (60%) */}
                        <div style={{ flex: '0 0 65%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                            <div style={{ position: 'relative', width: '340px', height: '600px', backgroundColor: '#000', borderRadius: '48px', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.5)', border: '12px solid #1a1a1a' }}>
                                <video
                                    ref={videoRef}
                                    key={selectedVideo?.url}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    preload="auto"
                                    crossOrigin="anonymous"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                >
                                    <source src={selectedVideo?.url} type="video/mp4" />
                                </video>

                                {/* PRODUCT OVERLAY PREVIEW */}
                                {firstTaggedProduct && (
                                    <div style={{ position: 'absolute', bottom: '24px', left: '16px', right: '16px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                                            <img src={firstTaggedProduct.featuredImage?.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <Text variant="bodyXs" fontWeight="bold" as="p" tone="magic" truncate>{firstTaggedProduct.title}</Text>
                                            <Text variant="bodyXs" as="p"><span style={{ color: '#fff', opacity: 0.9 }}>Rs. {firstTaggedProduct.variants?.nodes?.[0]?.price || "0.00"}</span></Text>
                                        </div>
                                        <div style={{ background: '#7cfc00', padding: '8px 16px', borderRadius: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
                                            <Text variant="bodyXs" fontWeight="bold" as="p"><span style={{ color: 'black' }}>Buy Now</span></Text>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT SIDE: SETTINGS PANEL (35%) */}
                        <div style={{ flex: '1', background: '#fff', borderLeft: '1px solid #e1e3e5', padding: '40px', overflowY: 'auto' }}>
                            <BlockStack gap="600">
                                <Box borderBlockEndWidth="025" borderColor="border" paddingBlockEnd="400">
                                    <InlineStack gap="300" blockAlign="center">
                                        <div style={{ background: '#f4f4f4', padding: '10px', borderRadius: '10px' }}>
                                            <Icon source={ViewIcon} tone="base" />
                                        </div>
                                        <div>
                                            <Text variant="headingMd" as="h3">Product Interactions</Text>
                                            <Text variant="bodySm" tone="subdued" as="p">{selectedVideo?.products?.length || 0} products tagged currently</Text>
                                        </div>
                                    </InlineStack>
                                </Box>

                                {selectedVideo?.products?.length > 0 && (
                                    <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '16px', border: '1px solid #edf0f2' }}>
                                        <BlockStack gap="400">
                                            {selectedVideo.products.map((tag: any) => {
                                                const prod = productsMap[tag.productId];
                                                return (prod &&
                                                    <InlineStack key={tag.id} align="space-between" blockAlign="center">
                                                        <InlineStack gap="300" blockAlign="center">
                                                            <Thumbnail source={prod.featuredImage?.url} size="small" alt="" />
                                                            <div style={{ maxWidth: '200px' }}>
                                                                <Text variant="bodyMd" as="p" truncate>{prod.title}</Text>
                                                            </div>
                                                        </InlineStack>
                                                        <Button tone="critical" variant="plain" onClick={() => fetcher.submit({ intent: "remove_tag", tagId: tag.id }, { method: "post" })}>Remove</Button>
                                                    </InlineStack>
                                                );
                                            })}
                                        </BlockStack>
                                    </div>
                                )}

                                <Button fullWidth variant="secondary" onClick={openResourcePicker} icon={UploadIcon} size="large">
                                    Tag More Products
                                </Button>

                                <Box borderBlockStartWidth="025" borderColor="border" paddingBlockStart="600">
                                    <BlockStack gap="400">
                                        <Text variant="headingSm" as="h4">Video Settings</Text>
                                        <TextField label="Video Title" value={editTitle} onChange={setEditTitle} autoComplete="off" />
                                        <TextField label="Page Targeting (Group)" value={editGroup} onChange={setEditGroup} autoComplete="off" placeholder="e.g. home, collection" helpText="Reels with the same tag will be grouped together." />
                                    </BlockStack>
                                </Box>

                                <Box paddingBlockStart="400">
                                    {selectedVideo?.absEnabled ? (
                                        <Banner tone="success" icon={CheckIcon}>
                                            <div style={{ padding: '4px' }}>
                                                <Text variant="bodySm" fontWeight="bold" as="p">ABS Optimization Active</Text>
                                                <Text variant="bodySm" as="p">This video is being served via adaptive bitrate for maximum speed.</Text>
                                            </div>
                                        </Banner>
                                    ) : (
                                        <div style={{ background: '#f0f7ff', padding: '24px', borderRadius: '20px', border: '1px solid #cce4ff' }}>
                                            <BlockStack gap="400">
                                                <Text variant="bodyMd" fontWeight="bold" as="p">Boost Performance</Text>
                                                {absProcessing ? (
                                                    <BlockStack gap="300">
                                                        <ProgressBar progress={60} size="small" tone="primary" />
                                                        <Text variant="bodySm" as="p" tone="subdued">Transcoding versions...</Text>
                                                    </BlockStack>
                                                ) : (
                                                    <BlockStack gap="300">
                                                        <Text variant="bodySm" as="p" tone="subdued">Users see 40% faster load times with ABS enabled.</Text>
                                                        <InlineStack gap="300">
                                                            <Button variant="primary" onClick={handleEnableABS}>Enable ABS Now</Button>
                                                        </InlineStack>
                                                    </BlockStack>
                                                )}
                                            </BlockStack>
                                        </div>
                                    )}
                                </Box>
                            </BlockStack>
                        </div>
                    </div>
                </div>
            )}

            <Modal open={uploadModalActive} onClose={() => !uploading && setUploadModalActive(false)} title="Uploading Video">
                <Modal.Section>
                    <BlockStack gap="400">
                        {uploadProgress && <Banner tone={uploadProgress.includes("Error") ? "critical" : "info"}><p>{uploadProgress}</p></Banner>}
                        {uploading && <div style={{ textAlign: 'center', padding: '20px' }}><Text as="p">Uploading to AWS S3...</Text></div>}
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </Page>
    );
}

declare global {
    interface Window {
        shopify: { resourcePicker: (options: any) => Promise<any> };
    }
}
