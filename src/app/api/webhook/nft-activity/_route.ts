import { env } from "@/env.mjs";
import {
  NFTActivityWebhook,
  WebhookError,
  parsePayload,
} from "@/lib/server/alchemy";
import { fetchObjekt } from "@/lib/server/cosmo";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const payload = await parsePayload<NFTActivityWebhook>(
      request,
      env.ALCHEMY_ACTIVITY_WEBHOOK_KEY
    );

    for (const activity of payload.event.activity) {
      console.log(`[nft-ingest] ${activity.erc721TokenId}`);
      // const objekt = await fetchObjekt(activity.erc721TokenId);
      // console.log(`[nft-ingest] ${objekt.name}`);
    }

    return Response.json({ status: "ok" });
  } catch (err) {
    if (err instanceof WebhookError) {
      return Response.json({ status: "error", error: err.message });
    }
  }
}
