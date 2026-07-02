import AddMissingMenu from "@/components/grid/add-missing-menu";
import IncludeTokensDialog from "@/components/grid/include-tokens-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import type { EditionLedger } from "@/lib/universal/grid";
import { deficitsFor } from "@/lib/universal/grid";
import { cn } from "@/lib/utils";
import {
  IconArrowRight,
  IconLockOpen,
  IconMinus,
  IconPlus,
} from "@tabler/icons-react";
import { useState } from "react";

type Props = {
  member: string;
  season: string;
  edition: EditionLedger;
  isOwner: boolean;
  includedTokenIds: ReadonlySet<string>;
  onToggleToken: (tokenId: string) => void;
};

const editionLabels = {
  1: m.grid_edition_1,
  2: m.grid_edition_2,
  3: m.grid_edition_3,
};

export default function GridEditionRow(props: Props) {
  const [includeOpen, setIncludeOpen] = useState(false);
  // extra grids planned beyond the next one, view-local like overrides
  const [extraGrids, setExtraGrids] = useState(0);
  const { edition } = props;

  const target = edition.completable + 1 + extraGrids;
  const deficits = deficitsFor(edition.numbers, target);
  const totalNeeded = deficits.reduce((acc, d) => acc + d.needed, 0);
  const neededByNo = new Map(deficits.map((d) => [d.collectionNo, d.needed]));

  const candidates = edition.numbers.reduce(
    (acc, pool) => acc + pool.nonTransferable.length,
    0,
  );

  return (
    <div className="flex flex-col gap-2 py-3">
      <span className="text-sm font-semibold text-muted-foreground">
        {editionLabels[edition.edition]()}
      </span>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="grid w-full grid-cols-4 gap-1.5 sm:max-w-130 sm:grid-cols-8">
          {edition.numbers.map((pool) => (
            <GridCard
              key={pool.collectionNo}
              label={pool.collectionNo}
              image={pool.thumbnailImage}
              alt={`${props.season} ${props.member} ${pool.collectionNo}`}
              count={pool.usable}
              dim={pool.usable === 0}
              needed={
                extraGrids > 0 ? (neededByNo.get(pool.collectionNo) ?? 0) : 0
              }
              title={`${pool.usable}/${pool.total}`}
            />
          ))}
        </div>

        <IconArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />

        <div className="flex items-center justify-between gap-3 sm:contents">
          <div className="grid w-26 shrink-0 grid-cols-2 gap-1.5 sm:w-32">
            {edition.rewards.map((reward) => (
              <GridCard
                key={reward.collectionNo}
                label={`${reward.collectionNo}Z`}
                image={reward.thumbnailImage}
                alt={`${props.season} ${props.member} ${reward.collectionNo}Z`}
                count={reward.owned}
                dim={reward.owned === 0}
              />
            ))}
          </div>

          <div className="flex flex-col items-end gap-1.5 sm:ml-auto">
            <Badge
              variant={edition.completable > 0 ? "default" : "secondary"}
              className="tabular-nums"
            >
              {m.grid_completable({ count: edition.completable.toString() })}
            </Badge>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-xs"
                aria-label={m.grid_target_decrease()}
                disabled={extraGrids === 0}
                onClick={() => setExtraGrids((n) => n - 1)}
              >
                <IconMinus />
              </Button>
              <span className="text-xs text-muted-foreground">
                {m.grid_target()}:{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {target}
                </span>
              </span>
              <Button
                variant="outline"
                size="icon-xs"
                aria-label={m.grid_target_increase()}
                disabled={target >= 99}
                onClick={() => setExtraGrids((n) => n + 1)}
              >
                <IconPlus />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {(props.isOwner || candidates > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {props.isOwner && (
            <AddMissingMenu
              member={props.member}
              season={props.season}
              deficits={deficits}
              label={
                extraGrids === 0
                  ? m.grid_missing_for_next({ count: totalNeeded.toString() })
                  : m.grid_missing_for_target({
                      count: totalNeeded.toString(),
                      target: target.toString(),
                    })
              }
            />
          )}

          {candidates > 0 && (
            <Button
              variant="default"
              size="xs"
              onClick={() => setIncludeOpen(true)}
            >
              <IconLockOpen className="size-3.5" />
              {m.grid_include_nontransferable()} ({candidates})
            </Button>
          )}
        </div>
      )}

      {candidates > 0 && (
        <IncludeTokensDialog
          open={includeOpen}
          onOpenChange={setIncludeOpen}
          member={props.member}
          season={props.season}
          edition={edition}
          includedTokenIds={props.includedTokenIds}
          onToggleToken={props.onToggleToken}
        />
      )}
    </div>
  );
}

function GridCard(props: {
  label: string;
  image: string | null;
  alt: string;
  count: number;
  dim: boolean;
  needed?: number;
  title?: string;
}) {
  const needed = props.needed ?? 0;

  return (
    <div className="@container" title={props.title}>
      <div
        className={cn(
          "relative aspect-photocard overflow-hidden rounded-photocard bg-secondary",
          props.dim && "border border-dashed border-destructive/60",
        )}
      >
        {props.image !== null && (
          <img
            src={props.image}
            alt={props.alt}
            loading="lazy"
            className={cn(
              "size-full object-cover",
              props.dim && "opacity-35 grayscale",
            )}
          />
        )}

        <span className="absolute top-1 left-1 rounded-sm bg-black/60 px-1 font-mono text-xxs font-semibold text-white">
          {props.label}
        </span>

        {props.count > 0 && (
          <span className="absolute right-1 bottom-1 rounded-sm bg-black/60 px-1 font-mono text-xxs font-semibold text-white tabular-nums">
            ×{props.count}
          </span>
        )}

        {needed > 0 && (
          <span className="text-destructive-foreground absolute bottom-1 left-1 rounded-full bg-destructive px-1.5 font-mono text-xxs font-semibold tabular-nums">
            +{needed}
          </span>
        )}
      </div>
    </div>
  );
}
