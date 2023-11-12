import { env } from "@/env.mjs";
import {
  NFTActivityWebhook,
  WebhookError,
  parsePayload,
} from "@/lib/server/alchemy";
import { fetchObjekt } from "@/lib/server/cosmo";
import { qstash } from "@/lib/server/qstash";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const payload = await parsePayload<NFTActivityWebhook>(
      request,
      env.ALCHEMY_ACTIVITY_WEBHOOK_KEY
    );

    for (const activity of payload.event.activity) {
      // fetch objekt from cosmo
      const objekt = await fetchObjekt(activity.erc721TokenId);
      console.log(`[alchemy-activity] received: ${objekt.objekt.collectionId}`);

      // publish message to the queue
      const result = await qstash.publishJSON({
        topic: env.QSTASH_OBJEKT_ACTIVITY_TOPIC,
        contentBasedDeduplication: true,
        body: {
          collectionId: objekt.objekt.collectionId,
          season: objekt.objekt.season,
          member: objekt.objekt.member,
          collectionNo: objekt.objekt.collectionNo,
          class: objekt.objekt.class,
          frontImage: objekt.objekt.frontImage,
          backImage: objekt.objekt.backImage,
          backgroundColor: objekt.objekt.backgroundColor,
          textColor: objekt.objekt.textColor,
          on_offline: objekt.objekt.collectionNo.match(/A$/)
            ? "offline"
            : "online",
        },
      });

      if (result.length !== 1) {
        return Response.json({ status: "error" });
      }

      if (result[0] && result[0].deduplicated) {
        console.log(
          `[alchemy-activity] deduplicated: ${objekt.objekt.collectionId}`
        );
      }
      return Response.json({ status: "ok" });
    }
  } catch (err) {
    if (err instanceof WebhookError) {
      return Response.json({ status: "error", error: err.message });
    }
  }
}
