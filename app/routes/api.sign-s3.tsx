import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    console.log("=== SIGN-S3 API CALLED ===");

    try {
        await authenticate.admin(request);
        const url = new URL(request.url);
        const filename = url.searchParams.get("filename");
        const filetype = url.searchParams.get("filetype");

        console.log("Request params:", { filename, filetype });

        if (!filename || !filetype) {
            console.error("Missing filename or filetype");
            return json({ error: "Filename and filetype are required" }, { status: 400 });
        }

        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        const region = process.env.AWS_REGION;
        const bucket = process.env.AWS_BUCKET;

        if (!accessKeyId || !secretAccessKey || !region || !bucket) {
            console.error("AWS Sign S3: Missing Credentials", { region, bucket, hasKey: !!accessKeyId, hasSecret: !!secretAccessKey });
            return json({ error: "Server misconfigured (Missing AWS Credentials)" }, { status: 500 });
        }

        console.log("AWS config:", { region, bucket });

        const s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey
            }
        });

        const key = `reelify-videos/${Date.now()}-${filename}`;
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: filetype,
            ACL: "public-read",
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

        console.log("✅ Presigned URL generated successfully");
        return json({ signedUrl, publicUrl });

    } catch (error) {
        console.error("S3 Sign Error:", error);
        return json({ error: `Failed to generate upload URL: ${error}` }, { status: 500 });
    }
};
