
import { json } from "@remix-run/node";
import { Link } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    BlockStack,
    Text,
    Button,
    Grid,
    Box,
    Badge,
} from "@shopify/polaris";

export default function Pricing() {
    return (
        <Page title="Plans & Pricing">
            <Layout>
                <Layout.Section>
                    <Grid>
                        {/* Free Plan */}
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <Card>
                                <BlockStack gap="400" align="center">
                                    <Text variant="headingLg" as="h2">Free Tier</Text>
                                    <Text variant="heading3xl" as="p">$0<span style={{ fontSize: '16px' }}>/mo</span></Text>
                                    <Badge tone="success">Current Plan</Badge>
                                    <Box paddingBlockStart="200">
                                        <BlockStack gap="200">
                                            <Text as="p">✅ Up to 5 Videos</Text>
                                            <Text as="p">✅ Basic Analytics</Text>
                                            <Text as="p">✅ Shoppable Links</Text>
                                        </BlockStack>
                                    </Box>
                                    <Button disabled>Selected</Button>
                                </BlockStack>
                            </Card>
                        </Grid.Cell>

                        {/* Pro Plan */}
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <Card>
                                <BlockStack gap="400" align="center">
                                    <Text variant="headingLg" as="h2">Pro Growth</Text>
                                    <Text variant="heading3xl" as="p">$19.99<span style={{ fontSize: '16px' }}>/mo</span></Text>
                                    <Box paddingBlockStart="200">
                                        <BlockStack gap="200">
                                            <Text as="p">🚀 Unlimited Videos</Text>
                                            <Text as="p">🚀 Advanced Analytics</Text>
                                            <Text as="p">🚀 Custom Branding</Text>
                                            <Text as="p">🚀 Priority Support</Text>
                                        </BlockStack>
                                    </Box>
                                    <Button variant="primary">Upgrade to Pro</Button>
                                </BlockStack>
                            </Card>
                        </Grid.Cell>
                    </Grid>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
