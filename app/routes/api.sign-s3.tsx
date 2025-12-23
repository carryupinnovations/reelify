
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    await authenticate.admin(request);
    const url = new URL(request.url);
    const filename = url.searchParams.get("filename");
    const filetype = url.searchParams.get("filetype");

    if (!filename || !filetype) {
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

    const s3Client = new S3Client({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    });

    const key = `uploads/${Date.now()}-${filename}`;
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: filetype,
        ACL: 'public-read' // Optional: depends on bucket policy. Usually better to use CloudFront or public bucket policy.
    });

    try {
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
        // Construct public URL (assuming standard S3 URL or CloudFront if configured)
        // For simplicity, using standard regional S3 URL
        const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

        return json({ signedUrl, publicUrl });
    } catch (error) {
        console.error("S3 Sign Error:", error);
        return json({ error: "Failed to generate upload URL" }, { status: 500 });
    }
};
