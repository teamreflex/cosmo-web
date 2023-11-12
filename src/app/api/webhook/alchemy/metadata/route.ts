import { env } from "@/env.mjs";
import {
  NFTMetadataWebhook,
  WebhookError,
  parsePayload,
} from "@/lib/server/alchemy";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const payload = await parsePayload<NFTMetadataWebhook>(
      request,
      env.ALCHEMY_METADATA_WEBHOOK_KEY
    );

    console.log(`[nft-metadata] ${payload.event.name}`);

    return Response.json({ status: "ok" });
  } catch (err) {
    if (err instanceof WebhookError) {
      return Response.json({ status: "error", error: err.message });
    }
  }
}
