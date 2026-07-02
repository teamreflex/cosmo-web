import AddMissingMenu from "@/components/grid/add-missing-menu";
import IncludeTokensDialog from "@/components/grid/include-tokens-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import type { EditionLedger, NumberPool } from "@/lib/universal/grid";
import { deficitsFor } from "@/lib/universal/grid";
import { cn } from "@/lib/utils";
import { IconLockOpen, IconMinus, IconPlus } from "@tabler/icons-react";
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="w-24 shrink-0 text-sm font-semibold text-muted-foreground">
          {editionLabels[edition.edition]()}
        </span>

        <div className="flex flex-wrap gap-1.5">
          {edition.numbers.map((pool) => (
            <NumberChip
              key={pool.collectionNo}
              pool={pool}
              needed={
                extraGrids > 0 ? (neededByNo.get(pool.collectionNo) ?? 0) : 0
              }
            />
          ))}
        </div>

        <Badge
          variant={edition.completable > 0 ? "default" : "secondary"}
          className="ml-auto tabular-nums"
        >
          {m.grid_completable({ count: edition.completable.toString() })}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:pl-27">
        <span className="text-xs text-muted-foreground">
          {m.grid_rewards()}:
        </span>
        {edition.rewards.map((reward) => (
          <span
            key={reward.collectionNo}
            className={cn(
              "font-mono text-xs tabular-nums",
              reward.owned > 0 ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {reward.collectionNo}Z ×{reward.owned}
          </span>
        ))}

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

        <div className="ml-auto flex items-center gap-1">
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

function NumberChip({ pool, needed }: { pool: NumberPool; needed: number }) {
  return (
    <span
      className={cn(
        "rounded-md border px-1.5 py-0.5 font-mono text-xs tabular-nums",
        pool.usable > 0 && needed === 0
          ? "border-transparent bg-secondary text-secondary-foreground"
          : "border-dashed border-destructive/60 text-destructive",
      )}
      title={`${pool.usable}/${pool.total}`}
    >
      {pool.collectionNo} ×{pool.usable}
      {needed > 0 && <span className="font-semibold"> +{needed}</span>}
    </span>
  );
}
