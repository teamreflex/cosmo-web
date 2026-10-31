import { m } from "@/i18n/messages";
import { getLocale } from "@/i18n/runtime";
import { env } from "@/lib/env/client";
import { cn } from "@/lib/utils";
import { CLAIM_CAP_BASE, CLAIM_CAP_TIERS } from "@apollo/trades/caps";
import { CLAIM_WINDOW } from "@apollo/trades/timers";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconArrowRight,
  IconArrowsExchange,
  IconCheck,
  IconClock,
  IconListCheck,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

/**
 * The market notice's illustrations: small mock-ups of the market's own
 * screens. Objekts are tinted cards rather than real artwork, and the traders
 * are two tripleS members in their representative colours.
 */

const TINTS = {
  pink: "bg-[oklch(0.81_0.093_4)]",
  sky: "bg-[oklch(0.84_0.072_237)]",
  lilac: "bg-[oklch(0.81_0.101_294)]",
  butter: "bg-[oklch(0.89_0.099_80)]",
  mint: "bg-[oklch(0.87_0.075_162)]",
  peach: "bg-[oklch(0.83_0.097_57)]",
};

const HEEJIN = {
  name: "HeeJin",
  className: "bg-[oklch(0.62_0.255_354)] text-white",
};
const SEOYEON = {
  name: "SeoYeon",
  className: "bg-[oklch(0.72_0.161_242)] text-black/85",
};

const offerLabel = "text-teal-700 dark:text-teal-500";
const wantLabel = "text-amber-700 dark:text-amber-500";

export type WantKind = "range" | "choice" | "exact";

// the panel every step's illustration sits in
export function ArtWell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-52 flex-col items-center justify-center gap-5 rounded-lg border bg-muted/50 p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

// a mock-up's card inside the well
function ArtCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full max-w-85 flex-col gap-2.5 rounded-lg border bg-background p-3">
      {children}
    </div>
  );
}

function Tile({ label, className }: { label?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex aspect-photocard w-9 shrink-0 items-end justify-center rounded-sm pb-1 text-xxs font-bold text-black/85",
        className,
      )}
    >
      {label}
    </div>
  );
}

function SideLabel({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-xxs font-medium tracking-widest whitespace-nowrap uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Avatar({
  member,
  className,
}: {
  member: typeof HEEJIN;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-6.5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        member.className,
        className,
      )}
    >
      {member.name[0]}
    </div>
  );
}

function LongArrow({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="116"
      height="10"
      viewBox="0 0 116 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(flip && "-scale-x-100")}
    >
      <path d="M2 5h110M107 1l4 4-4 4" />
    </svg>
  );
}

export function TransfersArt() {
  return (
    <ArtWell>
      <div className="flex items-center gap-3.5">
        <div className="flex flex-col items-center gap-2">
          <Tile label="201Z" className={cn("w-11", TINTS.pink)} />
          <span className="text-xs font-semibold">
            {m.market_notice_art_you()}
          </span>
        </div>
        <div className="mb-6 flex flex-col gap-3 text-muted-foreground">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xxs">{m.market_notice_art_sent_in()}</span>
            <LongArrow />
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <LongArrow flip />
            <span className="text-xxs">{m.market_notice_art_sent_in()}</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Tile label="202Z" className={cn("w-11", TINTS.lilac)} />
          <span className="text-xs font-semibold">
            {m.market_notice_art_trader()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
        <IconListCheck className="size-3.5 shrink-0 text-teal-700 dark:text-teal-500" />
        {m.market_notice_art_record({ appName: env.VITE_APP_NAME })}
      </div>
    </ArtWell>
  );
}

const WANT_EXAMPLES = {
  range: {
    ratio: "5 : 1",
    offer: [
      { label: "101Z", tint: TINTS.pink },
      { label: "102Z", tint: TINTS.sky },
      { label: "103Z", tint: TINTS.butter },
      { label: "104Z", tint: TINTS.mint },
      { label: "105Z", tint: TINTS.peach },
    ],
    want: [],
    caption: m.market_notice_want_range_example,
  },
  choice: {
    ratio: "1 : 1",
    offer: [
      { label: "101Z", tint: TINTS.lilac },
      { label: "101Z", tint: TINTS.lilac },
      { label: "101Z", tint: TINTS.lilac },
    ],
    want: [
      { label: "107Z", tint: TINTS.lilac },
      { label: "108Z", tint: TINTS.lilac },
    ],
    caption: m.market_notice_want_choice_example,
  },
  exact: {
    ratio: "1 : 1",
    offer: [{ label: "201Z", tint: TINTS.mint }],
    want: [{ label: "202Z", tint: TINTS.mint }],
    caption: m.market_notice_want_exact_example,
  },
} satisfies Record<
  WantKind,
  {
    ratio: string;
    offer: { label: string; tint: string }[];
    want: { label: string; tint: string }[];
    caption: () => string;
  }
>;

// one kind of want row traded for, with a caption; a range wants an open slot
export function WantExampleArt({ kind }: { kind: WantKind }) {
  const example = WANT_EXAMPLES[kind];

  return (
    <div className="flex flex-col items-center gap-3">
      <div aria-hidden className="flex items-end justify-center gap-2 sm:gap-3">
        <div className="flex flex-col gap-1.5">
          <SideLabel className={offerLabel}>
            {m.market_notice_art_offer()}
          </SideLabel>
          {/* a fanned stack: only the front card has room for its label */}
          <div className="flex -space-x-4.5">
            {example.offer.map((tile, i) => (
              <Tile
                key={i}
                label={i === example.offer.length - 1 ? tile.label : undefined}
                className={cn(tile.tint, "ring-2 ring-muted")}
              />
            ))}
          </div>
        </div>
        <div className="mb-4.5 flex flex-col items-center text-muted-foreground">
          <span className="font-mono text-xxs font-semibold whitespace-nowrap text-foreground">
            {example.ratio}
          </span>
          <IconArrowRight className="size-5" />
        </div>
        <div className="flex flex-col gap-1.5">
          <SideLabel className={wantLabel}>
            {m.market_notice_art_want()}
          </SideLabel>
          <div className="flex gap-1.5">
            {kind === "range" ? (
              <Tile
                label={m.market_notice_art_any()}
                className={cn(
                  "border-[1.5px] border-dashed border-current",
                  wantLabel,
                )}
              />
            ) : (
              example.want.map((tile) => (
                <Tile
                  key={tile.label}
                  label={tile.label}
                  className={tile.tint}
                />
              ))
            )}
          </div>
        </div>
      </div>
      <p className="max-w-85 text-center text-xs text-pretty text-muted-foreground">
        {example.caption()}
      </p>
    </div>
  );
}

const MATCHES = [
  { member: HEEJIN, has: "107Z", wants: "101Z" },
  { member: SEOYEON, has: "108Z", wants: "101Z" },
];

export function MatchesArt() {
  return (
    <ArtWell>
      <ArtCard>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">
            {m.market_notice_art_want_list()}
          </span>
          <span className="flex h-6 items-center gap-1 rounded-sm bg-teal-500/15 px-2 text-xxs font-semibold text-teal-700 dark:text-teal-400">
            <IconArrowsExchange className="size-3" />
            {m.market_notice_art_matches({
              title: m.list_matches_title(),
              count: MATCHES.length,
            })}
          </span>
        </div>
        {MATCHES.map((match) => (
          <div
            key={match.member.name}
            className="flex items-center gap-2.5 rounded-md bg-muted/60 p-2"
          >
            <Avatar member={match.member} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-semibold">{match.member.name}</span>
              <span className="truncate text-xxs text-muted-foreground">
                <ParaglideMessage
                  message={m.market_notice_art_match}
                  inputs={{ has: match.has, wants: match.wants }}
                  markup={{
                    has: ({ children }) => (
                      <span className={wantLabel}>{children}</span>
                    ),
                    wants: ({ children }) => (
                      <span className={offerLabel}>{children}</span>
                    ),
                  }}
                />
              </span>
            </div>
            <span className="flex h-6.5 items-center rounded-sm bg-primary px-2.5 text-xxs font-semibold text-primary-foreground">
              {m.list_matches_offer_send()}
            </span>
          </div>
        ))}
      </ArtCard>
    </ArtWell>
  );
}

const SIDES = [
  {
    title: m.my_trades_column_send,
    label: offerLabel,
    objekt: "101Z",
    // HeeJin's birthday
    serial: "001019",
    status: m.trade_page_item_sent,
    statusClass: "text-teal-700 dark:text-teal-400",
    icon: IconCheck,
  },
  {
    title: m.my_trades_column_get,
    label: wantLabel,
    objekt: "107Z",
    // SeoYeon's birthday
    serial: "00806",
    status: m.trade_page_item_waiting,
    statusClass: "text-muted-foreground",
    icon: IconClock,
  },
];

export function SendingArt() {
  return (
    <ArtWell>
      <ArtCard>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">
            {m.market_notice_art_trade_with({ name: SEOYEON.name })}
          </span>
          <span className="flex h-5.5 items-center gap-1 rounded-full bg-amber-500/15 px-2 text-xxs font-semibold text-amber-700 tabular-nums dark:text-amber-400">
            <IconClock className="size-3" />
            {m.market_notice_art_time_left({
              time: m.common_hours_minutes({
                hours: CLAIM_WINDOW / 3_600_000 - 1,
                minutes: 12,
              }),
            })}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SIDES.map((side) => (
            <div
              key={side.objekt}
              className="flex flex-col gap-1.5 rounded-md bg-muted/60 p-2"
            >
              <SideLabel className={side.label}>{side.title()}</SideLabel>
              <div className="flex items-center gap-2">
                <Tile className={cn("w-6", TINTS.lilac)} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xxs font-semibold">
                    {side.objekt}{" "}
                    <span className="font-mono">#{side.serial}</span>
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-xxs font-semibold",
                      side.statusClass,
                    )}
                  >
                    <side.icon className="size-2.5" stroke={3} />
                    {side.status()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Avatar member={SEOYEON} className="size-5 text-xxs" />
          <span className="rounded-lg bg-muted px-2 py-1 text-xxs">
            {m.market_notice_art_chat()}
          </span>
        </div>
      </ArtCard>
    </ArtWell>
  );
}

export function FeedbackArt() {
  const tiers = [
    { score: m.market_notice_caps_start(), cap: CLAIM_CAP_BASE },
    ...CLAIM_CAP_TIERS.map((score, i) => ({
      score: String(score),
      cap: CLAIM_CAP_BASE + i + 1,
    })),
  ];

  return (
    <ArtWell className="gap-3.5">
      <div
        aria-hidden
        className="flex items-center gap-1.5 text-xxs font-semibold"
      >
        <span className="flex h-6.5 items-center gap-1 rounded-full bg-teal-500/15 px-2.5 text-teal-700 ring-1 ring-teal-500/50 ring-inset dark:text-teal-300">
          <IconCheck className="size-3" stroke={3} />
          {m.feedback_rating_positive()}
        </span>
        <span className="flex h-6.5 items-center rounded-full bg-muted px-2.5 text-muted-foreground">
          {m.feedback_rating_neutral()}
        </span>
        <span className="flex h-6.5 items-center rounded-full bg-muted px-2.5 text-muted-foreground">
          {m.feedback_rating_negative()}
        </span>
      </div>
      <div className="flex w-full max-w-80 flex-col gap-1">
        <div
          role="img"
          aria-label={m.market_notice_caps_chart({
            start: CLAIM_CAP_BASE,
            tiers: new Intl.ListFormat(getLocale()).format(
              tiers
                .slice(1)
                .map((tier) => m.market_notice_caps_chart_tier(tier)),
            ),
          })}
          className="grid auto-cols-fr grid-flow-col items-end gap-1.5 tabular-nums"
        >
          {tiers.map((tier, i) => (
            <div key={tier.score} className="flex flex-col gap-1">
              <span className="text-center text-xxs font-semibold">
                {tier.cap}
              </span>
              <div
                className={cn(
                  "rounded-sm",
                  i === 0 ? "bg-foreground" : "bg-foreground/20",
                )}
                style={{ height: 12 + i * 8 }}
              />
              <span className="text-center text-xxs text-muted-foreground">
                {tier.score}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between gap-2 text-xxs text-muted-foreground">
          <span>{m.market_notice_caps_score()}</span>
          <span>{m.market_notice_caps_limit()}</span>
        </div>
      </div>
    </ArtWell>
  );
}
