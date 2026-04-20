import { useMetadataDialog } from "@/hooks/use-metadata-dialog";
import { m } from "@/i18n/messages";
import { listMatchesQuery, objektQuery } from "@/lib/queries/objekt-queries";
import type { TradePartner } from "@/lib/universal/lists";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { IconArrowsExchange, IconChevronRight } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import MetadataDialog from "../objekt/metadata-dialog";
import {
  getVariantGradient,
  getVariantRibbon,
} from "../objekt/variant-gradients";
import Portal from "../portal";
import UserAvatar from "../profile/user-avatar";
import { Skeleton } from "../ui/skeleton";

type Props = {
  listId: string;
};

const MAX_VISIBLE_TILES = 12;

export default function ListMatchesContent({ listId }: Props) {
  const { data } = useSuspenseQuery(listMatchesQuery(listId));
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  if (data.partners.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{m.list_matches_empty()}</p>
    );
  }

  return (
    <>
      <Portal to="#list-matches-count">
        {m.list_matches_partners_label({ count: data.partners.length })}
      </Portal>
      <ul className="flex flex-col divide-y divide-border rounded-md border overflow-clip">
        {data.partners.map((partner, index) => (
          <PartnerRow
            key={partner.userId}
            partner={partner}
            rank={index + 1}
            expanded={expandedUserId === partner.userId}
            collections={data.collections}
            onToggle={() =>
              setExpandedUserId((prev) =>
                prev === partner.userId ? null : partner.userId,
              )
            }
          />
        ))}
      </ul>
    </>
  );
}

type PartnerRowProps = {
  partner: TradePartner;
  rank: number;
  expanded: boolean;
  collections: Record<string, Objekt.Collection>;
  onToggle: () => void;
};

function PartnerRow({
  partner,
  rank,
  expanded,
  collections,
  onToggle,
}: PartnerRowProps) {
  const overlapHave = partner.theyHaveIWant.length;
  const overlapWant = partner.iHaveTheyWant.length;

  return (
    <li className={cn(expanded && "bg-muted/40")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60"
      >
        <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {String(rank).padStart(2, "0")}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-x-3 gap-y-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <UserAvatar
              variant="square"
              username={partner.username}
              className="size-7 sm:size-9"
            />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {partner.username}
            </span>
          </div>
          <MatchSignature have={overlapHave} want={overlapWant} />
        </div>
        <IconChevronRight
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border px-3 pb-3 pt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DirectionColumn
              arrow="←"
              title={m.list_matches_they_have_you_want()}
              slugs={partner.theyHaveIWant}
              collections={collections}
              tone="want"
            />
            <DirectionColumn
              arrow="→"
              title={m.list_matches_you_have_they_want()}
              slugs={partner.iHaveTheyWant}
              collections={collections}
              tone="have"
            />
          </div>
        </div>
      )}
    </li>
  );
}

type MatchSignatureProps = {
  have: number;
  want: number;
};

function MatchSignature({ have, want }: MatchSignatureProps) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs tabular-nums">
      <MatchChip value={have} label={m.list_matches_have_label()} tone="have" />
      <IconArrowsExchange className="size-3.5 text-muted-foreground" />
      <MatchChip value={want} label={m.list_matches_want_label()} tone="want" />
    </div>
  );
}

const toneClasses = {
  have: {
    border: "border-teal-500/60",
    bg: "bg-teal-500/10",
    text: "text-teal-500",
  },
  want: {
    border: "border-amber-500/60",
    bg: "bg-amber-500/10",
    text: "text-amber-500",
  },
} as const;

function MatchChip({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "have" | "want";
}) {
  const c = toneClasses[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5",
        c.border,
        c.bg,
        c.text,
      )}
    >
      <span className="font-semibold">{value}</span>
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </span>
  );
}

type DirectionColumnProps = {
  arrow: "←" | "→";
  title: string;
  slugs: string[];
  collections: Record<string, Objekt.Collection>;
  tone: "have" | "want";
};

function DirectionColumn({
  arrow,
  title,
  slugs,
  collections,
  tone,
}: DirectionColumnProps) {
  const visible = slugs.slice(0, MAX_VISIBLE_TILES);
  const overflow = slugs.length - visible.length;
  const c = toneClasses[tone];

  return (
    <div className={cn("flex flex-col gap-1.5 border-l-2 pl-3", c.border)}>
      <div
        className={cn(
          "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider",
          c.text,
        )}
      >
        <span>{arrow}</span>
        <span className="flex-1 truncate">{title}</span>
        <span className="tabular-nums text-muted-foreground">
          {slugs.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((slug) => {
          const collection = collections[slug];
          return collection ? (
            <MiniObjektTile key={slug} collection={collection} />
          ) : (
            <span
              key={slug}
              className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px]"
            >
              {slug}
            </span>
          );
        })}
        {overflow > 0 && (
          <span className="flex h-14 items-center rounded-sm bg-muted px-2 font-mono text-xs text-muted-foreground">
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
}

function MiniObjektTile({ collection }: { collection: Objekt.Collection }) {
  return (
    <MetadataDialog slug={collection.slug}>
      <MiniObjektTileButton collection={collection} />
    </MetadataDialog>
  );
}

function MiniObjektTileButton({
  collection,
}: {
  collection: Objekt.Collection;
}) {
  const { open } = useMetadataDialog();
  const queryClient = useQueryClient();
  const background = collection.backgroundColor || "#333";
  const variantGradient = getVariantGradient(collection);
  const variantRibbon = getVariantRibbon(collection);
  const tileBackground = variantGradient
    ? `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.8) 100%), repeating-linear-gradient(135deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 8px), ${variantGradient}`
    : `linear-gradient(180deg, ${background}33 0%, ${background}08 60%, rgba(0,0,0,.35) 100%), repeating-linear-gradient(135deg, ${background}14 0 2px, transparent 2px 8px)`;
  const ribbonBackground = variantRibbon ?? background;
  return (
    <button
      type="button"
      onClick={() => {
        queryClient.setQueryData(
          objektQuery(collection.slug).queryKey,
          collection,
        );
        open();
      }}
      className="relative flex h-14 w-28 overflow-hidden rounded-sm border border-border transition-shadow hover:shadow-md"
      title={`${collection.member} ${collection.collectionNo}`}
    >
      <div
        className="relative flex flex-1 flex-col items-start justify-between px-1.5 py-1 dark:[&>*]:[text-shadow:_0_1px_2px_rgba(0,0,0,0.9)]"
        style={{ background: tileBackground }}
      >
        <div className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground">
          {collection.season}
        </div>
        <div className="font-cosmo text-[10px] font-black uppercase leading-none text-foreground">
          {collection.member}
        </div>
        <div className="font-mono text-xxs tabular-nums text-foreground">
          {collection.collectionNo}
        </div>
      </div>
      <div
        className="w-[14px] shrink-0"
        style={{ background: ribbonBackground }}
      />
    </button>
  );
}

export function ListMatchesSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
