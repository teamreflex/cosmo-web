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
import type { RangeFilter } from "@apollo/trades/range";
import { IconCards } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type CSSProperties, type ReactNode, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "../ui/skeleton";

type TileProps = {
  filter: RangeFilter;
  /** the range as text, which names the tile */
  label: string;
  className?: string;
};

/**
 * A range want in a thumbnail stack: a card-shaped tile, dashed and tinted
 * in its group's colour, with the group's logo in the middle. A range open
 * to any artist, or several, gets a neutral tile.
 */
export function RangeTile({ filter, label, className }: TileProps) {
  const { getArtist } = useArtists();
  const artist = rangeArtist(filter);

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
  filter: RangeFilter;
  /** shows how many collections the range covers, at the row's end */
  matches?: boolean;
};

/**
 * A range want as a row of badges: the count, then the group, each season,
 * each member (or any member), class and on/offline, and how many
 * collections it covers.
 */
export function RangeBadges({ count, filter, matches = true }: BadgesProps) {
  const { getArtist, getMember } = useArtists();
  const artist = rangeArtist(filter);
  const group = artist === null ? undefined : getArtist(artist);

  return (
    <div className="flex min-w-0 flex-auto flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-1 basis-72 items-start gap-3">
        <WantCount count={count} />
        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {group !== undefined && artist !== null && (
            <Chip
              image={group.logoImageUrl}
              style={{ "--tint": artistColors[artist] }}
              className="border-(--tint)/60"
            >
              {group.title}
            </Chip>
          )}
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
      </div>
      {matches && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={<Skeleton className="h-4 w-28" />}>
            <MatchCount filter={filter} />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
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
 * How many collections the range covers, the composer's count read again.
 */
function MatchCount({ filter }: { filter: RangeFilter }) {
  const { data } = useSuspenseQuery(rangeMatchCountQuery(filter));

  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {data === 0
        ? m.listing_composer_range_no_matches()
        : m.listing_detail_range_any_of({
            count: data,
            formatted: formatCount(data),
          })}
    </span>
  );
}
