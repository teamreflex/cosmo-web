import {
  type DisputeReason,
  type PaymentMethod,
  type TradeItemKind,
  type TradeSide,
  tradeSides,
} from "@apollo/database/web/types";
import { accountName, formatSerial } from "@apollo/util";
import * as z from "zod";
import {
  formatPaymentText,
  parsePaymentItem,
  type PaymentItem,
} from "./payment";

/**
 * A dispute staff hear about in Discord: one a party opened, or one
 * trade-timers opened when a deadline passed with something still owed.
 */
export type DisputeAlert = {
  reportId: string;
  tradeId: string;
  reason: DisputeReason | "deadline_passed";
  note: string | null;
  // the party who opened it, or null when trade-timers did
  openedBy: TradeSide | null;
  fromUserId: string | null;
  toUserId: string | null;
};

// a party's names, or null for a deleted account
export type DisputeParty = {
  username: string | null;
  cosmoUsername: string | null;
} | null;

// a `trade_offer_items` row as both apps read it
export type DisputeItemRow = {
  id: number;
  sender: TradeSide;
  kind: TradeItemKind;
  tokenId: number | null;
  member: string | null;
  season: string | null;
  amount: string | null;
  currency: string | null;
  method: PaymentMethod | null;
  markedPaidAt: Date | null;
  confirmedAt: Date | null;
};

// an objekt row narrowed, as `trade_offer_items_objekt_chk` guarantees
const disputeObjektSchema = z.object({
  sender: z.enum(tradeSides),
  tokenId: z.int(),
  member: z.string(),
  season: z.string(),
});
type DisputeItem =
  | ({ kind: "objekt" } & z.infer<typeof disputeObjektSchema>)
  | ({ kind: "payment" } & PaymentItem);

// what each app reads after the dispute commits
export type DisputeDetails = {
  parties: Record<TradeSide, DisputeParty>;
  items: readonly DisputeItemRow[];
  // the indexer's collection number and serial, by token id
  tokens: ReadonlyMap<number, { collectionNo: string; serial: number }>;
};

// an embed field holds 1024 characters, which a 30-objekt side can pass
const MAX_LISTED_ITEMS = 20;

/**
 * The Discord webhook request for a new dispute, linking into the web app at
 * `origin`, so apps/web and apps/schedules post the same message. The link
 * buttons need `with_components`, because the webhook isn't owned by an
 * application. Mentions are disabled, because the note is the party's own
 * text.
 */
export function disputeWebhookRequest(
  webhookUrl: string,
  origin: string,
  alert: DisputeAlert,
  details: DisputeDetails,
) {
  const url = new URL(webhookUrl);
  url.searchParams.set("with_components", "true");
  const name = (side: TradeSide) => partyName(details.parties[side]);
  const items = details.items.map((row): DisputeItem =>
    row.kind === "payment"
      ? { kind: "payment", ...parsePaymentItem(row) }
      : { kind: "objekt", ...disputeObjektSchema.parse(row) },
  );

  return {
    url: url.href,
    body: {
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title:
            alert.openedBy === null
              ? "Trade frozen at its deadline"
              : `${name(alert.openedBy)} opened a dispute`,
          description: alert.note ?? undefined,
          fields: [
            { name: "Reason", value: alert.reason },
            ...(["from", "to"] as const).map((side) => ({
              name: `${name(side)} sends`,
              value: sideSummary(items, details.tokens, side),
              inline: true,
            })),
          ],
          timestamp: new Date().toISOString(),
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: "Open report",
              url: new URL(`/admin/reports?report=${alert.reportId}`, origin)
                .href,
            },
            {
              type: 2,
              style: 5,
              label: "View trade",
              url: new URL(`/trade/${alert.tradeId}`, origin).href,
            },
          ],
        },
      ],
    },
  };
}

// the name staff see on the trade page: the COSMO name, else the Apollo one
function partyName(party: DisputeParty) {
  if (party === null) return "Deleted account";
  if (party.cosmoUsername !== null) return accountName(party.cosmoUsername);
  return party.username ?? "Unnamed account";
}

// "JinSoul Atom01 344Z #00012" or "USD 12.50, confirmed via wise", one per line
function sideSummary(
  items: readonly DisputeItem[],
  tokens: DisputeDetails["tokens"],
  side: TradeSide,
) {
  const lines = items
    .filter((item) => item.sender === side)
    .map((item) => itemLabel(item, tokens));
  if (lines.length === 0) return "Nothing";
  const listed = lines.slice(0, MAX_LISTED_ITEMS).map((line) => `- ${line}`);
  const rest = lines.length - listed.length;
  return [...listed, ...(rest > 0 ? [`and ${rest} more`] : [])].join("\n");
}

function itemLabel(item: DisputeItem, tokens: DisputeDetails["tokens"]) {
  if (item.kind === "payment") {
    const amount = formatPaymentText(item.amount, item.currency);
    switch (item.progress.stage) {
      case "confirmed":
        return `${amount}, confirmed via ${item.progress.method}`;
      case "marked":
        return `${amount}, marked paid, not confirmed`;
      case "unpaid":
        return `${amount}, not confirmed`;
    }
  }
  const token = tokens.get(item.tokenId);
  return token === undefined
    ? `${item.member} ${item.season} (token ${item.tokenId})`
    : `${item.member} ${item.season} ${token.collectionNo} ${formatSerial(token.serial)}`;
}
