import { json, redirect, type ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useNavigate } from "@remix-run/react";
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

export const action = async ({ request }: ActionFunctionArgs) => {
    console.log("=== VIDEO CREATE ACTION CALLED ===");
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const group = (formData.get("group") as string) || "all";
    const url = formData.get("url") as string;
    const thumbnail = formData.get("thumbnail") as string;

    console.log("Form data received:", { title, group, url, thumbnail, shop: session.shop });

    if (!url) {
        console.log("Validation failed: URL is required");
        return json({ errors: { url: "URL is required" } }, { status: 400 });
    }

    const video = await prisma.video.create({
        data: {
            title: title || "Untitled",
            group,
            url,
            thumbnail: thumbnail || "",
            shop: session.shop
        }
    });

    console.log("Video created successfully:", video.id);
    return redirect(`/app/videos`);
};

export default function NewVideo() {
    const actionData = useActionData<typeof action>();
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [group, setGroup] = useState("all");
    const [url, setUrl] = useState("");
    const [thumbnail, setThumbnail] = useState("");
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        console.log("=== FILE UPLOAD STARTED ===");
        console.log("File:", file.name, file.type, file.size);
        setUploading(true);

        try {
            const apiUrl = `/api/sign-s3?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type)}`;
            console.log("Requesting presigned URL from:", apiUrl);

            const res = await fetch(apiUrl);
            const data = await res.json();
            console.log("Presigned URL response:", data);

            if (data.error) {
                console.error("Error from sign-s3 API:", data.error);
                alert(`Error: ${data.error}`);
                setUploading(false);
                return;
            }

            console.log("Uploading file to S3...");
            const uploadRes = await fetch(data.signedUrl, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type
                }
            });

            console.log("S3 upload response status:", uploadRes.status);
            if (uploadRes.ok) {
                console.log("✅ Upload successful! URL:", data.publicUrl);
                setUrl(data.publicUrl);
                alert("Video uploaded successfully to S3!");
            } else {
                const errorText = await uploadRes.text();
                console.error("S3 upload failed:", uploadRes.status, errorText);
                alert("Upload failed. Check console for details.");
            }
        } catch (e) {
            console.error("Upload error:", e);
            alert("Upload error: " + e);
        } finally {
            setUploading(false);
            console.log("=== FILE UPLOAD ENDED ===");
        }
    };

    return (
        <Page
            backAction={{ content: "Videos", onAction: () => navigate('/app/videos') }}
            title="Add New Video"
        >
            <Layout>
                <Layout.Section>
                    <Form method="post">
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
                                        name="title"
                                        value={title}
                                        onChange={setTitle}
                                        autoComplete="off"
                                        placeholder="Summer Collection Showcase"
                                    />

                                    <TextField
                                        label="Video Group (Page Targeting)"
                                        name="group"
                                        value={group}
                                        onChange={setGroup}
                                        autoComplete="off"
                                        placeholder="home, product-page, etc."
                                        helpText="Use this to filter which videos appear on specific pages."
                                    />

                                    <div style={{
                                        border: '2px dashed #E1E3E5',
                                        padding: '20px',
                                        borderRadius: '8px',
                                        backgroundColor: '#F6F6F7'
                                    }}>
                                        <BlockStack gap="300">
                                            <Text variant="headingSm" as="h3">Upload Video to AWS S3</Text>
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={handleFileChange}
                                                disabled={uploading}
                                                style={{
                                                    padding: '10px',
                                                    width: '100%',
                                                    fontSize: '14px'
                                                }}
                                            />
                                            {uploading && (
                                                <Banner tone="info">
                                                    <p>Uploading to S3... please wait.</p>
                                                </Banner>
                                            )}
                                            {url && (
                                                <Banner tone="success">
                                                    <p>✅ Video uploaded! URL has been set.</p>
                                                </Banner>
                                            )}
                                        </BlockStack>
                                    </div>

                                    <TextField
                                        label="Video URL (MP4)"
                                        name="url"
                                        value={url}
                                        onChange={setUrl}
                                        autoComplete="off"
                                        placeholder="https://s3.amazonaws.com/..."
                                        helpText="Upload a file above or paste a direct video URL"
                                        error={actionData?.errors?.url}
                                    />

                                    <TextField
                                        label="Thumbnail URL (Optional)"
                                        name="thumbnail"
                                        value={thumbnail}
                                        onChange={setThumbnail}
                                        autoComplete="off"
                                        placeholder="https://example.com/thumb.jpg"
                                    />

                                    <Button
                                        submit
                                        variant="primary"
                                        disabled={uploading || !url}
                                        onClick={() => console.log("=== CREATE VIDEO BUTTON CLICKED ===")}
                                    >
                                        {uploading ? 'Uploading...' : 'Create Video'}
                                    </Button>
                                </FormLayout>
                            </BlockStack>
                        </Card>
                    </Form>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
