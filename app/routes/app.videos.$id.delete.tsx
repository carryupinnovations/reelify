
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { redirect } from "@remix-run/node";

export const action = async ({ request, params }) => {
    const { session } = await authenticate.admin(request);
    const { id } = params;

    if (id) {
        await prisma.video.delete({
            where: { id, shop: session.shop }
        });
    }

    return redirect("/app/videos");
};
