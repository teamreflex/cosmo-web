import { useArtists } from "@/hooks/use-artists";
import { m } from "@/i18n/messages";
import {
  formatCount,
  onOfflineLabel,
  rangeArtist,
} from "@/lib/client/trade-listings";
import { rangeMatchCountQuery } from "@/lib/queries/trade-listings";
import { getSeasonColor } from "@/lib/universal/seasons";
import { artistColors, cn } from "@/lib/utils";
import { toUiArtist } from "@apollo/trades/composer";
import type { RangeFilter } from "@apollo/trades/range";
import { IconCards } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type CSSProperties, Fragment, type ReactNode, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "../ui/skeleton";

type TileProps = {
  ranges: readonly RangeFilter[];
  /** the range as text, which names the tile */
  label: string;
  className?: string;
};

/**
 * A range want in a thumbnail stack: a card-shaped tile, dashed and tinted
 * in its group's colour, with the group's logo in the middle. A row open to
 * any artist, or to several across its ranges, gets a neutral tile.
 */
export function RangeTile({ ranges, label, className }: TileProps) {
  const { getArtist } = useArtists();
  const artist = rangeArtist(ranges);

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{
        "--artist":
          artist === null
            ? "var(--color-muted-foreground)"
            : artistColors[artist],
      }}
      className={cn(
        "flex aspect-photocard shrink-0 items-center justify-center rounded-[3px] border border-dashed border-(--artist)/75 bg-[color-mix(in_oklch,var(--artist)_22%,var(--color-card))]",
        className,
      )}
    >
      {artist === null ? (
        <IconCards className="w-1/2 text-muted-foreground" />
      ) : (
        <img
          src={getArtist(artist)?.logoImageUrl}
          alt=""
          className="aspect-square w-1/2 rounded-full ring-1 ring-border"
        />
      )}
    </span>
  );
}

type BadgesProps = {
  count: number;
  ranges: readonly RangeFilter[];
  /** shows how many collections the row covers, at the row's end */
  matches?: boolean;
};

/**
 * A range want as rows of badges: the count, then each range's badges, "or"
 * between them, and how many collections the row covers.
 */
export function RangeBadges({ count, ranges, matches = true }: BadgesProps) {
  return (
    <div className="flex min-w-0 flex-auto flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-1 basis-72 items-start gap-3">
        <WantCount count={count} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {ranges.map((filter, index) => (
            <Fragment key={index}>
              {index > 0 && (
                <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
                  {m.listing_range_or()}
                </span>
              )}
              <RangeChips filter={filter} />
            </Fragment>
          ))}
        </div>
      </div>
      {matches && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={<Skeleton className="h-4 w-28" />}>
            <MatchCount ranges={ranges} />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}

/**
 * One range's badges: each group, each season, each member (or any
 * member), collection number, class and on/offline.
 */
function RangeChips({ filter }: { filter: RangeFilter }) {
  const { getArtist, getMember } = useArtists();
  const groups = filter.artist.flatMap((stored) => {
    const artist = toUiArtist(stored);
    if (artist === undefined) return [];
    const group = getArtist(artist);
    return group === undefined ? [] : [{ artist, group }];
  });

  return (
    <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
      {groups.map(({ artist, group }) => (
        <Chip
          key={artist}
          image={group.logoImageUrl}
          style={{ "--tint": artistColors[artist] }}
          className="border-(--tint)/60"
        >
          {group.title}
        </Chip>
      ))}
      {filter.season.map((season) => {
        const color = getSeasonColor(season);
        return (
          <Chip key={season}>
            {color !== null && (
              <span
                style={{ backgroundColor: color }}
                className="size-2.5 shrink-0 rounded-full"
              />
            )}
            {season}
          </Chip>
        );
      })}
      {filter.member.length === 0 ? (
        <Chip className="text-muted-foreground">
          {m.listing_detail_range_any_member()}
        </Chip>
      ) : (
        filter.member.map((name) => {
          const member = getMember(name);
          return member === undefined ? (
            <Chip key={name}>{name}</Chip>
          ) : (
            <Chip
              key={name}
              image={member.profileImageUrl}
              style={{ "--tint": member.primaryColorHex }}
              className="border-(--tint)/60 bg-[color-mix(in_oklch,var(--tint)_14%,var(--color-card))]"
            >
              {member.name}
            </Chip>
          );
        })
      )}
      {filter.collectionNo.map((value) => (
        <Chip key={value} className="font-mono">
          {value}
        </Chip>
      ))}
      {filter.class.map((value) => (
        <Chip key={value}>{value}</Chip>
      ))}
      {filter.on_offline.map((value) => (
        <Chip key={value}>{onOfflineLabel(value)}</Chip>
      ))}
    </ul>
  );
}

/**
 * An exact want as a range row reads: its count, then one badge naming the
 * collection.
 */
export function ExactBadges({ count, name }: { count: number; name: string }) {
  return (
    <div className="flex min-w-0 flex-auto items-start gap-3">
      <WantCount count={count} />
      <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <Chip>{name}</Chip>
      </ul>
    </div>
  );
}

function WantCount({ count }: { count: number }) {
  return (
    <span className="min-w-8 shrink-0 font-mono text-lg font-bold text-amber-700 tabular-nums dark:text-amber-500">
      {count}×
    </span>
  );
}

function Chip({
  image,
  style,
  className,
  children,
}: {
  image?: string;
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
}) {
  return (
    <li
      dir="auto"
      style={style}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-xs font-medium whitespace-nowrap",
        image !== undefined && "pl-1",
        className,
      )}
    >
      {image !== undefined && (
        <img src={image} alt="" className="size-5 shrink-0 rounded-full" />
      )}
      {children}
    </li>
  );
}

/**
 * How many collections the row covers, the composer's count read again.
 */
function MatchCount({ ranges }: { ranges: readonly RangeFilter[] }) {
  const { data } = useSuspenseQuery(rangeMatchCountQuery(ranges));

  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {data.total === 0
        ? m.listing_composer_range_no_matches()
        : m.listing_detail_range_any_of({
            count: data.total,
            formatted: formatCount(data.total),
          })}
    </span>
  );
}
