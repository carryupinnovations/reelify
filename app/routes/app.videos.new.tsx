
import { json, redirect } from "@remix-run/node";
import { useActionData, useSubmit, useNavigate, Form } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    FormLayout,
    TextField,
    Button,
    BlockStack,
    Banner,
    Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useState } from "react";

export const action = async ({ request }) => {
    const { admin, session } = await authenticate.admin(request);
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const group = (formData.get("group") as string) || "all";
    const url = formData.get("url") as string;
    const thumbnail = formData.get("thumbnail") as string;

    if (!url) {
        return json({ errors: { url: "URL is required" } }, { status: 400 });
    }

    const shop = session.shop;

    const video = await prisma.video.create({
        data: {
            title,
            group,
            url,
            thumbnail,
            shop
        }
    });

    return redirect(`/app/videos/${video.id}`);
};

export default function NewVideo() {
    const actionData = useActionData();
    const submit = useSubmit();
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [group, setGroup] = useState("all");
    const [url, setUrl] = useState("");
    const [thumbnail, setThumbnail] = useState("");
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        // 1. Get presigned URL
        try {
            const res = await fetch(`/api/sign-s3?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type)}`);
            const data = await res.json();

            if (data.error) {
                alert(`Error signing: ${data.error}`);
                setUploading(false);
                return;
            }

            // 2. Upload to S3
            const uploadRes = await fetch(data.signedUrl, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type
                }
            });

            if (uploadRes.ok) {
                setUrl(data.publicUrl);
                // Try to set thumbnail automatically if possible? Or just url.
            } else {
                alert("Upload failed");
                console.error("Upload failed", uploadRes);
            }
        } catch (e) {
            console.error("Upload error", e);
            alert("Upload error");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = () => {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("group", group);
        formData.append("url", url);
        formData.append("thumbnail", thumbnail);
        submit(formData, { method: "post" });
    };

    return (
        <Page
            breadcrumbs={[{ content: "Videos", url: "/app/videos" }]}
            title="Add New Video"
        >
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="500">
                            {actionData?.errors && (
                                <Banner tone="critical">
                                    <p>{actionData.errors.url}</p>
                                </Banner>
                            )}
                            <FormLayout>
                                <TextField
                                    label="Title"
                                    value={title}
                                    onChange={setTitle}
                                    autoComplete="off"
                                    placeholder="Summer Collection Showcase"
                                />
                                <TextField
                                    label="Video Group (Page Targeting)"
                                    value={group}
                                    onChange={setGroup}
                                    autoComplete="off"
                                    placeholder="home, product-page, etc."
                                    helpText="Use this to filter which videos appear on specific pages."
                                />

                                <div style={{ border: '1px dashed #ccc', padding: '20px', borderRadius: '8px' }}>
                                    <BlockStack gap="200">
                                        <Text variant="headingSm" as="h3">Upload Video</Text>
                                        <input type="file" accept="video/mp4" onChange={handleFileChange} disabled={uploading} />
                                        {uploading && <Text as="p">Uploading... please wait.</Text>}
                                    </BlockStack>
                                </div>

                                <TextField
                                    label="Video URL (MP4)"
                                    value={url}
                                    onChange={setUrl}
                                    autoComplete="off"
                                    placeholder="https://cdn.shopify.com/..."
                                    helpText="Direct link to an MP4 file (or upload above)."
                                    error={actionData?.errors?.url}
                                />
                                <TextField
                                    label="Thumbnail URL"
                                    value={thumbnail}
                                    onChange={setThumbnail}
                                    autoComplete="off"
                                    placeholder="https://example.com/thumb.jpg"
                                />
                                <Button submit onClick={handleSubmit} variant="primary" disabled={uploading}>Create Video</Button>
                            </FormLayout>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
