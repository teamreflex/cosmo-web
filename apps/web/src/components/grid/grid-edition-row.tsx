import AddMissingMenu from "@/components/grid/add-missing-menu";
import IncludeTokensDialog from "@/components/grid/include-tokens-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import type { EditionLedger, NumberPool } from "@/lib/universal/grid";
import { cn } from "@/lib/utils";
import { IconLockOpen } from "@tabler/icons-react";
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
  const { edition } = props;

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
            <NumberChip key={pool.collectionNo} pool={pool} />
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
            deficits={edition.deficits}
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

function NumberChip({ pool }: { pool: NumberPool }) {
  return (
    <span
      className={cn(
        "rounded-md border px-1.5 py-0.5 font-mono text-xs tabular-nums",
        pool.usable > 0
          ? "border-transparent bg-secondary text-secondary-foreground"
          : "border-dashed border-destructive/60 text-destructive",
      )}
      title={`${pool.usable}/${pool.total}`}
    >
      {pool.collectionNo} ×{pool.usable}
    </span>
  );
}
