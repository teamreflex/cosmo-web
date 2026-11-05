import type { MailObjekt, NotificationItem } from "../../content";
import type { RenderConfig } from "./layout";

// what the preview server (`bun run dev`) renders with; it serves `static/`
export const previewConfig = {
  appName: "Apollo",
  logoUrl: "/static/logo.png",
} satisfies RenderConfig;

export const previewUrl = "https://apollo.cafe/example?token=preview";

// real collections, through COSMO's own image hosts
export const sampleObjekts = {
  chaeyeon: {
    member: "ChaeYeon",
    collectionNo: "206Z",
    serial: 412,
    imageUrl:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/d53a6789-4854-4fc1-4ab3-dc0fc8929500/thumbnail",
    backgroundColor: "#F7F7F7",
    textColor: "#000000",
  },
  kaede: {
    member: "Kaede",
    collectionNo: "101Z",
    serial: 1877,
    imageUrl:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/72b523af-1122-4a8e-47a7-6cf195560700/thumbnail",
    backgroundColor: "#75FB4C",
    textColor: "#000000",
  },
  jiyeon: {
    member: "JiYeon",
    collectionNo: "204Z",
    serial: 93,
    imageUrl:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/4485ad7e-6b36-444b-8c49-e7b31e637e00/thumbnail",
    backgroundColor: "#F7F7F7",
    textColor: "#000000",
  },
  soomin: {
    member: "SooMin",
    collectionNo: "120Z",
    serial: 256,
    imageUrl:
      "https://resources.cosmo.fans/images/collection-front-image/2000/9ed2b4e1a36b46419c3082215872624820260918015044849.webp",
    backgroundColor: "#FF7477",
    textColor: "#000000",
  },
} satisfies Record<string, MailObjekt>;

const { chaeyeon, kaede, jiyeon, soomin } = sampleObjekts;
const deadline = new Date("2026-11-07T14:00:00Z");

// one item of every type, for the preview server
export const sampleItems = {
  offer_received: {
    type: "offer_received",
    id: "1",
    party: "Kairu",
    url: "https://apollo.cafe/trade/1",
    youGet: { objekts: [kaede, jiyeon], payments: [] },
    youSend: { objekts: [chaeyeon], payments: [] },
    expiresAt: new Date("2026-11-08T09:30:00Z"),
  },
  offer_countered: {
    type: "offer_countered",
    id: "2",
    party: "Nites",
    url: "https://apollo.cafe/trade/2",
    youGet: {
      objekts: [soomin],
      payments: [{ amount: "5.00", currency: "USD" }],
    },
    youSend: { objekts: [kaede], payments: [] },
    expiresAt: new Date("2026-11-08T09:30:00Z"),
  },
  offer_accepted: {
    type: "offer_accepted",
    id: "3",
    party: "Kairu",
    url: "https://apollo.cafe/trade/3",
    youGet: { objekts: [chaeyeon], payments: [] },
    youSend: { objekts: [kaede, jiyeon, soomin], payments: [] },
    deadlineAt: deadline,
  },
  listing_claimed: {
    type: "listing_claimed",
    id: "4",
    party: "Nites",
    url: "https://apollo.cafe/trade/4",
    youGet: { objekts: [], payments: [{ amount: "12.50", currency: "USD" }] },
    youSend: { objekts: [soomin], payments: [] },
    deadlineAt: deadline,
  },
  trade_cancelled: {
    type: "trade_cancelled",
    id: "5",
    party: "Kairu",
    url: "https://apollo.cafe/trade/5",
    youGet: { objekts: [jiyeon], payments: [] },
    youSend: { objekts: [chaeyeon], payments: [] },
    byStaff: false,
  },
  trade_disputed: {
    type: "trade_disputed",
    id: "6",
    party: "Nites",
    url: "https://apollo.cafe/trade/6",
    youGet: { objekts: [kaede, soomin], payments: [] },
    youSend: { objekts: [chaeyeon, jiyeon], payments: [] },
    byStaff: false,
  },
  trade_dispute_resolved: {
    type: "trade_dispute_resolved",
    id: "7",
    party: "Nites",
    url: "https://apollo.cafe/trade/7",
    youGet: { objekts: [kaede, soomin], payments: [] },
    youSend: { objekts: [chaeyeon, jiyeon], payments: [] },
    outcome: "completed",
  },
  trade_deadline_extended: {
    type: "trade_deadline_extended",
    id: "8",
    party: "Nites",
    url: "https://apollo.cafe/trade/8",
    youGet: { objekts: [kaede, soomin], payments: [] },
    youSend: { objekts: [chaeyeon, jiyeon], payments: [] },
    deadlineAt: deadline,
  },
} satisfies {
  [T in NotificationItem["type"]]: Extract<NotificationItem, { type: T }>;
};

export const sampleManageUrl = "https://apollo.cafe/account#notifications";
