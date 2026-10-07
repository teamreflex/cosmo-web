import { m } from "@/i18n/messages";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { time } from "@/lib/universal/transfer-grouping";
import type {
  Counterparty,
  SpinOutcome,
  TransferObjekt,
  TransferRow as Row,
} from "@/lib/universal/transfers";
import { cn } from "@/lib/utils";
import { Addresses } from "@apollo/util";
import {
  IconArrowDownLeft,
  IconArrowsLeftRight,
  IconArrowUpRight,
  IconBan,
  IconCheck,
  IconChevronDown,
  IconCirclePlus,
  IconInfoCircle,
  IconLoader2,
  IconRotate360,
  IconScan,
  IconSparkles,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import { SPECIAL_RIBBON_LINEAR } from "../objekt/variant-gradients";
import { Badge } from "../ui/badge";
import { Collapse } from "../ui/collapse";
import { Timestamp } from "../ui/timestamp";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

/**
 * Desktop columns: when, out, arrow, in, outcome, with, chevron. Narrower
 * screens put out → in on the first line and everything else on the second.
 */
const grid =
  "grid grid-cols-[minmax(0,1fr)_18px_minmax(0,1fr)] gap-x-2 lg:grid-cols-[136px_minmax(0,1fr)_28px_minmax(0,1fr)_168px_176px_20px] lg:gap-x-4";

export function TransferHeader() {
  return (
    <div
      aria-hidden
      className={cn(
        grid,
        "sticky top-14 z-20 hidden border-b bg-card/90 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-lg lg:grid",
      )}
    >
      <span>{m.transfer_when_header()}</span>
      <span className="flex items-center gap-1">
        <IconArrowUpRight className="size-3" />
        {m.transfer_out_header()}
      </span>
      <span />
      <span className="flex items-center gap-1">
        <IconArrowDownLeft className="size-3" />
        {m.transfer_in_header()}
      </span>
      <span>{m.transfer_outcome_header()}</span>
      <span>{m.transfer_with_header()}</span>
      <span />
    </div>
  );
}

type Props = {
  row: Row;
};

export default function TransferRow({ row }: Props) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const details = detailTransfers(row);
  const expandable = details.length > 1;
  const { out, inn } = sides(row);
  const oneSided = inn === null && row.kind !== "spin";

  return (
    <li
      data-open={open}
      className="border-t border-border/60 transition-colors hover:bg-secondary/50 data-[open=true]:bg-secondary/30 data-[open=true]:hover:bg-secondary/50"
    >
      <div
        className={cn(
          grid,
          "relative items-center gap-y-2.5 px-3.5 py-3 text-sm sm:px-4 lg:py-2.5",
        )}
      >
        <div
          className={cn(
            "col-start-1 row-start-1 flex min-w-0 items-center gap-2 lg:col-start-2",
            out.length === 0 && "max-lg:hidden",
            oneSided && "max-lg:col-span-full",
          )}
        >
          {out.length > 0 && <Side objekts={out} />}
        </div>

        <div
          aria-hidden
          className={cn(
            "col-start-2 row-start-1 flex items-center justify-center text-muted-foreground lg:col-start-3",
            (out.length === 0 || oneSided) && "max-lg:hidden",
          )}
        >
          <Connector row={row} />
        </div>

        <div
          className={cn(
            "col-start-3 row-start-1 flex min-w-0 items-center gap-2 lg:col-start-4",
            out.length === 0 && "max-lg:col-span-full max-lg:col-start-1",
            oneSided && "max-lg:hidden",
          )}
        >
          {row.kind === "spin" && !row.reward ? (
            <EmptySlot outcome={row.outcome} />
          ) : (
            inn && <Side objekts={inn} reward={row.kind === "spin"} />
          )}
        </div>

        <div className="col-span-full row-start-2 flex flex-wrap items-center gap-x-3 gap-y-2 lg:contents">
          <When row={row} details={details} />
          <div className="flex min-w-0 items-center lg:col-start-5 lg:row-start-1">
            <Outcome row={row} />
          </div>
          <div className="flex min-w-0 items-center gap-1.5 lg:col-start-6 lg:row-start-1">
            <With row={row} />
          </div>
          <div
            aria-hidden
            className="order-4 flex items-center justify-center text-muted-foreground lg:order-none lg:col-start-7 lg:row-start-1"
          >
            {expandable && (
              <IconChevronDown
                className={cn(
                  "size-4 transition-transform motion-reduce:transition-none",
                  open && "rotate-180",
                )}
              />
            )}
          </div>
        </div>

        {expandable && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            aria-label={
              open ? m.transfer_hide_details() : m.transfer_show_details()
            }
            onClick={() => setOpen((prev) => !prev)}
            className="absolute inset-0 cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          />
        )}
      </div>

      {expandable && (
        <Collapse id={detailsId} open={open}>
          <Details transfers={details} />
        </Collapse>
      )}
    </li>
  );
}

/**
 * What left the owner and what came in; `inn` is null when nothing did.
 */
type RowSides = {
  out: TransferObjekt[];
  inn: TransferObjekt[] | null;
};

function sides(row: Row): RowSides {
  switch (row.kind) {
    case "spin":
      return { out: [row.spun], inn: row.reward ? [row.reward] : null };
    case "trade":
      return { out: row.sent, inn: row.received };
    case "sent":
      return { out: row.objekts, inn: null };
    case "received":
      return { out: [], inn: row.objekts };
    case "mint":
      return { out: [], inn: [row.objekt] };
  }
}

function Connector({ row }: { row: Row }) {
  if (row.kind === "trade") {
    return <IconArrowsLeftRight className="size-5" />;
  }
  if (row.kind !== "spin") return null;

  // the shaft breaks up when nothing came back (yet)
  const dash = { success: undefined, fail: "2.5 3", pending: "0.5 3.5" }[
    row.outcome
  ];
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h15" strokeDasharray={dash} />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function collectionName(objekt: TransferObjekt) {
  return objekt.collection?.collectionId ?? m.transfer_unknown();
}

function formatSerial(objekt: TransferObjekt) {
  return objekt.serial === null
    ? null
    : `#${objekt.serial.toString().padStart(5, "0")}`;
}

/**
 * One side of a row: a card, or a stack of up to three with a count of the
 * rest, beside its name and serial. A Special or Premier spin reward gets a
 * ring in its class's colors.
 */
function Side({
  objekts,
  reward = false,
}: {
  objekts: TransferObjekt[];
  reward?: boolean;
}) {
  const [first] = objekts;
  if (!first) return null;
  const multi = objekts.length > 1;
  const serial = formatSerial(first);

  return (
    <>
      <span className="isolate flex shrink-0 items-center">
        {objekts.slice(0, 3).map((objekt, i) => (
          <span
            key={objekt.transfer.id}
            className={cn(
              "relative flex shrink-0",
              i === 0 && "z-3",
              i === 1 && "z-2 -ml-6 brightness-80 max-sm:-ml-5",
              i === 2 && "z-1 -ml-6 brightness-60 max-sm:-ml-5",
            )}
          >
            {reward && objekt.collection?.class === "Special" && (
              <span
                aria-hidden
                className="absolute -inset-1 rounded-[6px] p-0.5 [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)]"
                style={{ background: SPECIAL_RIBBON_LINEAR }}
              />
            )}
            <Thumbnail
              objekt={objekt}
              size="md"
              className={cn(
                multi && "ring-2 ring-card",
                reward &&
                  objekt.collection?.class === "Premier" &&
                  "ring-2 ring-amber-300 ring-offset-2 ring-offset-card",
              )}
            />
          </span>
        ))}
      </span>
      {objekts.length > 3 && (
        <span className="shrink-0 rounded-sm border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
          +{objekts.length - 3}
        </span>
      )}
      <span className="ml-0.5 flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-medium max-sm:whitespace-normal">
          {multi
            ? m.transfer_objekt_count({ count: objekts.length })
            : collectionName(first)}
        </span>
        {multi ? (
          <span className="truncate text-xs text-muted-foreground max-sm:hidden">
            {objekts
              .map(
                (o) =>
                  `${o.collection?.member ?? ""} ${o.collection?.collectionNo ?? ""}`,
              )
              .join(" · ")}
          </span>
        ) : (
          serial && (
            <span className="font-mono text-xs text-muted-foreground">
              {serial}
            </span>
          )
        )}
      </span>
    </>
  );
}

/**
 * Row cards, and the smaller ones in an expanded row.
 */
const cardSizes = { md: "w-9 max-sm:w-7.5", sm: "w-5.5" };
const card = "aspect-photocard shrink-0 rounded-[3px]";

function Thumbnail({
  objekt,
  size,
  className,
}: {
  objekt: TransferObjekt;
  size: keyof typeof cardSizes;
  className?: string;
}) {
  const base = cn(card, cardSizes[size], "bg-muted");
  if (!objekt.collection) return <span className={cn(base, className)} />;

  return (
    <img
      src={getObjektFrontImageUrl(objekt.collection, "xs")}
      alt={objekt.collection.collectionId}
      width={36}
      height={56}
      loading="lazy"
      decoding="async"
      className={cn(base, "object-cover object-top", className)}
    />
  );
}

/**
 * The reward slot of a spin with nothing in it, yet or ever.
 */
function EmptySlot({ outcome }: { outcome: SpinOutcome }) {
  const base = cn(card, cardSizes.md, "flex items-center justify-center");

  return outcome === "pending" ? (
    <span
      role="img"
      aria-label={m.transfer_awaiting_reward()}
      className={cn(
        base,
        "border border-cosmo/50 bg-cosmo/10 text-cosmo motion-safe:animate-pulse",
      )}
    >
      <IconLoader2 className="size-4 motion-safe:animate-spin" />
    </span>
  ) : (
    <span
      role="img"
      aria-label={m.transfer_no_reward()}
      className={cn(
        base,
        "border border-dashed border-orange-500/70 text-orange-600 dark:border-orange-400/70 dark:text-orange-300",
      )}
    >
      <IconBan className="size-4" />
    </span>
  );
}

function When({ row, details }: { row: Row; details: DetailTransfer[] }) {
  const first = details.at(0);
  const last = details.at(-1);

  return (
    <div className="order-3 ml-auto flex items-baseline gap-1.5 font-mono text-xs text-muted-foreground lg:order-none lg:col-start-1 lg:row-start-1 lg:ml-0 lg:flex-col lg:items-start lg:justify-center lg:gap-0.5">
      {first && last && details.length > 1 ? (
        <>
          <time dateTime={row.timestamp} className="whitespace-nowrap">
            {format(new Date(first.objekt.transfer.timestamp), "h:mm")}–
            {format(new Date(last.objekt.transfer.timestamp), "h:mm a")}
          </time>
          <span className="font-sans whitespace-nowrap max-sm:hidden">
            {m.transfer_group_meta({
              count: details.length,
              minutes: Math.max(
                1,
                Math.round((time(last.objekt) - time(first.objekt)) / 60_000),
              ),
            })}
          </span>
        </>
      ) : (
        <>
          <Timestamp
            date={new Date(row.timestamp)}
            format="h:mm:ss a"
            className="whitespace-nowrap"
          />
          {row.kind === "spin" && row.outcome === "pending" && (
            <Timestamp
              date={new Date(row.timestamp)}
              relative="narrow"
              className="font-sans whitespace-nowrap"
            />
          )}
        </>
      )}
    </div>
  );
}

function Outcome({ row }: { row: Row }) {
  switch (row.kind) {
    case "spin":
      return <SpinBadge row={row} />;
    case "trade":
      return (
        <Badge variant="outline" className="gap-1.5 sm:pr-1">
          <IconArrowsLeftRight />
          {m.transfer_kind_trade()}
          <span className="font-mono text-muted-foreground">
            {row.sent.length}:{row.received.length}
          </span>
          <Tooltip>
            <TooltipTrigger
              aria-label={m.transfer_trade_detected()}
              className="relative z-10 flex rounded-full text-muted-foreground hover:text-foreground max-sm:hidden"
            >
              <IconInfoCircle className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>{m.transfer_trade_detected()}</TooltipContent>
          </Tooltip>
        </Badge>
      );
    case "sent":
      return (
        <Badge variant="outline">
          <IconArrowUpRight />
          {m.transfer_kind_sent()}
        </Badge>
      );
    case "received":
      return (
        <Badge variant="outline">
          <IconArrowDownLeft />
          {m.transfer_kind_received()}
        </Badge>
      );
    case "mint":
      return row.objekt.collection?.onOffline === "offline" ? (
        <Badge variant="outline">
          <IconScan />
          {m.transfer_kind_scanned()}
        </Badge>
      ) : (
        <Badge variant="outline">
          <IconCirclePlus />
          {m.transfer_kind_mint()}
        </Badge>
      );
  }
}

function SpinBadge({ row }: { row: Extract<Row, { kind: "spin" }> }) {
  switch (row.outcome) {
    case "success":
      switch (row.reward?.collection?.class) {
        case "Special":
          return (
            <Badge
              variant="spin-special"
              style={{ background: SPECIAL_RIBBON_LINEAR }}
            >
              <IconSparkles />
              {row.reward.collection.class}
            </Badge>
          );
        case "Premier":
          return (
            <Badge variant="spin-premier">
              <IconSparkles />
              {row.reward.collection.class}
            </Badge>
          );
        default:
          return (
            <Badge variant="spin-success">
              <IconCheck />
              {m.transfer_outcome_success()}
            </Badge>
          );
      }
    case "fail":
      return (
        <Badge variant="spin-fail">
          <IconBan />
          {m.transfer_outcome_fail()}
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="spin-pending">
          <IconLoader2 className="motion-safe:animate-spin" />
          {m.transfer_outcome_pending()}
        </Badge>
      );
  }
}

function QuietLabel({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground [&>svg]:size-3.5">
      {icon}
      {children}
    </span>
  );
}

function With({ row }: { row: Row }) {
  switch (row.kind) {
    case "spin":
      return (
        <>
          <IconRotate360 className="size-5.5 shrink-0" />
          <span className="truncate">{m.transfer_cosmo_spin()}</span>
        </>
      );
    case "mint":
      return (
        <>
          <img
            src="/cosmo.webp"
            alt=""
            className="size-5.5 shrink-0 rounded-full ring ring-accent"
          />
          <DirectionPill direction="from" />
          <span className="truncate">{m.common_cosmo()}</span>
        </>
      );
    case "trade":
      return <UserLink counterparty={row.counterparty} />;
    case "sent":
    case "received":
      return (
        <UserLink
          counterparty={row.counterparty}
          direction={row.kind === "sent" ? "to" : "from"}
        />
      );
  }
}

function UserLink({
  counterparty,
  direction,
}: {
  counterparty: Counterparty;
  direction?: "from" | "to";
}) {
  const name = counterparty.username ?? counterparty.address.substring(0, 8);

  return (
    <>
      <img
        src="/profile.webp"
        alt=""
        className="size-5.5 shrink-0 rounded-full bg-cosmo-profile p-0.5"
      />
      {direction && <DirectionPill direction={direction} />}
      {counterparty.address === Addresses.NULL ? (
        <span className="truncate font-mono">{name}</span>
      ) : (
        <Link
          to="/@{$username}"
          params={{ username: counterparty.username ?? counterparty.address }}
          className="relative z-10 truncate font-medium hover:underline"
        >
          {name}
        </Link>
      )}
    </>
  );
}

function DirectionPill({ direction }: { direction: "from" | "to" }) {
  return (
    <span
      data-receiver={direction === "from"}
      className="shrink-0 rounded-sm bg-[#8ebdd1] px-1.5 text-xxs leading-4 font-bold text-[#0f1e25] data-[receiver=true]:bg-[#D5B7E2] data-[receiver=true]:text-[#22172a]"
    >
      {direction === "from" ? m.transfer_from() : m.transfer_to()}
    </span>
  );
}

type DetailTransfer = {
  objekt: TransferObjekt;
  direction: "sent" | "received";
};

/**
 * Every transfer folded into a trade or batch, oldest first.
 */
function detailTransfers(row: Row): DetailTransfer[] {
  switch (row.kind) {
    case "trade":
      return [
        ...row.sent.map((objekt) => ({ objekt, direction: "sent" as const })),
        ...row.received.map((objekt) => ({
          objekt,
          direction: "received" as const,
        })),
      ].toSorted((a, b) => time(a.objekt) - time(b.objekt));
    case "sent":
    case "received": {
      const direction = row.kind;
      return row.objekts.map((objekt) => ({ objekt, direction }));
    }
    default:
      return [];
  }
}

/**
 * Every transfer in a trade or batch, oldest first, laid out on the row's
 * columns.
 */
function Details({ transfers }: { transfers: DetailTransfer[] }) {
  return (
    <ol className="mx-2 mb-3 overflow-hidden rounded-md border border-border/60 bg-background">
      {transfers.map(({ objekt, direction }) => {
        const sent = direction === "sent";
        const label = (
          <QuietLabel
            icon={sent ? <IconArrowUpRight /> : <IconArrowDownLeft />}
          >
            {sent ? m.transfer_kind_sent() : m.transfer_kind_received()}
          </QuietLabel>
        );

        return (
          <li
            key={objekt.transfer.id}
            className={cn(
              grid,
              "items-center border-b border-border/40 px-2 py-1.5 last:border-b-0 max-lg:grid-cols-[88px_minmax(0,1fr)]",
            )}
          >
            <Timestamp
              date={new Date(objekt.transfer.timestamp)}
              format="h:mm:ss a"
              className="font-mono text-xs whitespace-nowrap text-muted-foreground"
            />
            <div
              className={cn(
                "min-w-0",
                sent ? "lg:col-start-2" : "lg:col-start-4",
              )}
            >
              <DetailCard objekt={objekt} label={label} />
            </div>
            <div className="max-lg:hidden lg:col-span-3 lg:col-start-5">
              {label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * A card in an expanded row. Narrower screens show its direction under the
 * name, since they have no outcome column.
 */
function DetailCard({
  objekt,
  label,
}: {
  objekt: TransferObjekt;
  label: ReactNode;
}) {
  const serial = formatSerial(objekt);
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Thumbnail objekt={objekt} size="sm" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex min-w-0 items-baseline gap-2.5">
          <span className="truncate text-xs font-medium">
            {collectionName(objekt)}
          </span>
          {serial && (
            <span className="font-mono text-xs text-muted-foreground">
              {serial}
            </span>
          )}
        </span>
        <span className="lg:hidden">{label}</span>
      </span>
    </span>
  );
}
