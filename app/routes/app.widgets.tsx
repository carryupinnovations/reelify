
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    BlockStack,
    Text,
    Select,
    Button,
    Banner,
    InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useState } from "react";

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);

    let settings = await prisma.widgetSettings.findUnique({
        where: { shop: session.shop }
    });

    if (!settings) {
        settings = await prisma.widgetSettings.create({
            data: { shop: session.shop, layout: "BUBBLE" }
        });
    }

    return json({ settings });
};

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const layout = formData.get("layout");

    await prisma.widgetSettings.update({
        where: { shop: session.shop },
        data: { layout: layout as string }
    });

    return json({ status: "success" });
};

export default function Widgets() {
    const { settings } = useLoaderData();
    const actionData = useActionData();
    const submit = useSubmit();

    const [layout, setLayout] = useState(settings.layout);

    const handleSave = () => {
        const formData = new FormData();
        formData.append("layout", layout);
        submit(formData, { method: "post" });
    };

    const layoutOptions = [
        { label: "Stories Bubbles (Instagram Style)", value: "BUBBLE" },
        { label: "Video Carousel (Card Style)", value: "CAROUSEL" },
        { label: "Grid Gallery", value: "GRID" },
    ];

    return (
        <Page title="Widget Configuration">
            <Layout>
                <Layout.Section>
                    <BlockStack gap="500">
                        {actionData?.status === "success" && (
                            <Banner tone="success">
                                <p>Settings saved successfully!</p>
                            </Banner>
                        )}

                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">Appearance</Text>
                                <Select
                                    label="Layout Style"
                                    options={layoutOptions}
                                    onChange={setLayout}
                                    value={layout}
                                    helpText="Choose how the videos are displayed on your store."
                                />

                                <div style={{ padding: '20px', background: '#f4f4f4', borderRadius: '8px', textAlign: 'center' }}>
                                    <Text tone="subdued" as="p">Preview: {layoutOptions.find(o => o.value === layout)?.label}</Text>
                                    {/* Detailed visual preview could go here */}
                                </div>

                                <InlineStack align="end">
                                    <Button variant="primary" onClick={handleSave}>Save Settings</Button>
                                </InlineStack>
                            </BlockStack>
                        </Card>

                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">Installation</Text>
                                <p>To add the widget to your store:</p>
                                <ol style={{ marginLeft: '20px' }}>
                                    <li>Go to <strong>Online Store &gt; Themes</strong>.</li>
                                    <li>Click **Customize**.</li>
                                    <li>Click **Add Block** or **Add Section** (depending on your theme).</li>
                                    <li>Select **Shoppable Videos** under Apps.</li>
                                    <li>Ensure you paste your App URL in the block settings if required.</li>
                                </ol>
                            </BlockStack>
                        </Card>
                    </BlockStack>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
