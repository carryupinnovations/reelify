
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    BlockStack,
    Text,
    TextField,
    Button,
    Select,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);

    return json({
        shop: session.shop,
    });
};

export default function Settings() {
    const { shop } = useLoaderData<typeof loader>();
    const [storeName, setStoreName] = useState("");
    const [supportEmail, setSupportEmail] = useState("");
    const [timezone, setTimezone] = useState("UTC");

    return (
        <Page
            title="Settings"
            subtitle="Manage your app preferences and configurations"
        >
            <Layout>
                <Layout.Section>
                    <BlockStack gap="500">
                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">General Settings</Text>
                                <TextField
                                    label="Store Name"
                                    value={storeName}
                                    onChange={setStoreName}
                                    autoComplete="off"
                                    helpText="Display name for your store"
                                />
                                <TextField
                                    label="Support Email"
                                    value={supportEmail}
                                    onChange={setSupportEmail}
                                    autoComplete="email"
                                    type="email"
                                    helpText="Email for customer support inquiries"
                                />
                                <Select
                                    label="Timezone"
                                    options={[
                                        { label: 'UTC', value: 'UTC' },
                                        { label: 'EST', value: 'EST' },
                                        { label: 'PST', value: 'PST' },
                                        { label: 'IST', value: 'IST' },
                                    ]}
                                    value={timezone}
                                    onChange={setTimezone}
                                />
                            </BlockStack>
                        </Card>

                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">Video Settings</Text>
                                <Text as="p" tone="subdued">
                                    Configure default settings for video uploads and playback
                                </Text>
                                <Text as="p" tone="subdued">
                                    Coming soon: Auto-play settings, default video quality, thumbnail generation
                                </Text>
                            </BlockStack>
                        </Card>

                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">Analytics & Tracking</Text>
                                <Text as="p" tone="subdued">
                                    Enable analytics to track video performance and engagement
                                </Text>
                                <Text as="p" tone="subdued">
                                    Coming soon: Google Analytics integration, custom event tracking
                                </Text>
                            </BlockStack>
                        </Card>

                        <Button variant="primary">Save Settings</Button>
                    </BlockStack>
                </Layout.Section>

                <Layout.Section variant="oneThird">
                    <Card>
                        <BlockStack gap="200">
                            <Text variant="headingMd" as="h2">Account Info</Text>
                            <Text as="p">
                                <strong>Shop:</strong> {shop}
                            </Text>
                            <Text as="p" tone="subdued">
                                Connected and active
                            </Text>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
