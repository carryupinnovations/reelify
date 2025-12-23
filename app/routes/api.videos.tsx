
import { json, LoaderFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";
import { cors } from "remix-utils/cors";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const group = url.searchParams.get("group");

    if (!shop) {
        return json({ error: "Missing shop parameter" }, { status: 400 });
    }

    const whereClause: any = { shop };
    if (group) {
        // If group is specified, we match exact group OR 'all' OR null (legacy)
        whereClause.OR = [
            { group: group },
            { group: "all" },
            { group: null }
        ];
    }

    // Fetch videos for this shop
    const videos = await prisma.video.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: { products: true }
    });

    return cors(request, json({ videos }));
};
