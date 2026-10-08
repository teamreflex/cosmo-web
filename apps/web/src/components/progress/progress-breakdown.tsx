import { m } from "@/i18n/messages";
import type { SeasonProgress } from "@/lib/universal/progress";
import { cn } from "@/lib/utils";
import type { ValidOnlineType } from "@apollo/cosmo/types/common";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import ProgressObjektGrid from "./progress-objekt-grid";
import ProgressTypeTabs from "./progress-type-tabs";

export type BreakdownRow = {
  season: string;
  cells: Map<string, SeasonProgress>;
  owned: number;
  total: number;
  bonus: number;
};

type Props = {
  rows: BreakdownRow[];
  classes: string[];
  onlineType: ValidOnlineType | undefined;
  setOnlineType: (value: ValidOnlineType | undefined) => void;
};

/**
 * Seasons by classes, where a cell opens the objekts of that season and class.
 * Phones stack each season's classes as rows instead of columns.
 */
export default function ProgressBreakdown(props: Props) {
  const [selected, setSelected] = useState<string>();
  const [hideComplete, setHideComplete] = useState(false);

  const rows = hideComplete
    ? props.rows.filter((row) => row.owned < row.total)
    : props.rows;

  return (
    <div
      style={{ "--class-count": props.classes.length }}
      className="flex flex-col gap-3 [--breakdown-cols:9rem_repeat(var(--class-count),minmax(0,1fr))_8rem]"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="font-cosmo text-lg uppercase">
          {m.progress_breakdown()}
        </h2>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 max-sm:w-full">
          <Label className="min-h-11 cursor-pointer text-sm font-semibold">
            <Checkbox
              checked={hideComplete}
              onCheckedChange={setHideComplete}
            />
            {m.progress_hide_complete()}
          </Label>
          <ProgressTypeTabs
            className="max-sm:w-full"
            value={props.onlineType}
            onChange={props.setOnlineType}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="hidden grid-cols-(--breakdown-cols) gap-2 px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:grid">
          <span>{m.progress_season()}</span>
          {props.classes.map((c) => (
            <span key={c}>{c}</span>
          ))}
          <span className="text-right">{m.progress_season_total()}</span>
        </div>

        {rows.map((row) => (
          <SeasonRow
            key={row.season}
            row={row}
            classes={props.classes}
            selected={selected}
            onSelect={(key) =>
              setSelected((prev) => (prev === key ? undefined : key))
            }
          />
        ))}
      </div>
    </div>
  );
}

type SeasonRowProps = {
  row: BreakdownRow;
  classes: string[];
  selected: string | undefined;
  onSelect: (key: string) => void;
};

function SeasonRow({ row, classes, selected, onSelect }: SeasonRowProps) {
  const open = Array.from(row.cells.values()).find((p) => p.key === selected);
  const percentage = Math.floor((row.owned / row.total) * 100);

  return (
    <div className="border-t first:border-t-0 md:first:border-t">
      <div className="flex flex-col gap-1 p-2 md:grid md:grid-cols-(--breakdown-cols) md:items-center md:gap-2 md:px-4 md:py-2.5">
        {/* phones show the season and its total as a header, desktop splits them into the first and last columns */}
        <div className="flex items-baseline justify-between px-2 pt-2 pb-1 md:contents">
          <h3 className="font-cosmo uppercase">{row.season}</h3>
          <p className="flex items-baseline gap-2 text-sm md:order-last md:flex-col md:items-end md:gap-0.5">
            <span className="font-bold">{percentage}%</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {row.owned} / {row.total}
              {row.bonus > 0 && ` · +${row.bonus}`}
            </span>
          </p>
        </div>

        {classes.map((c) => {
          const progress = row.cells.get(c);
          return progress ? (
            <ClassCell
              key={c}
              progress={progress}
              isSelected={progress.key === selected}
              onSelect={() => onSelect(progress.key)}
            />
          ) : (
            <span
              key={c}
              className="hidden h-16 items-center px-3 text-muted-foreground/40 md:flex"
            >
              <span aria-hidden>—</span>
              <span className="sr-only">{m.progress_not_released()}</span>
            </span>
          );
        })}
      </div>

      {open && (
        <div className="mx-2 mb-2 flex flex-col gap-4 rounded-lg border border-cosmo/35 bg-background/50 p-3 md:mx-4 md:mb-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h4 className="font-cosmo uppercase">
                {row.season} · {m.progress_class({ class: open.class })}
              </h4>
              <p className="text-sm text-muted-foreground">
                {cellSummary(open)}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label={m.common_close()}
              onClick={() => onSelect(open.key)}
            >
              <IconX />
            </Button>
          </div>
          <ProgressObjektGrid collections={open.collections} />
        </div>
      )}
    </div>
  );
}

type ClassCellProps = {
  progress: SeasonProgress;
  isSelected: boolean;
  onSelect: () => void;
};

function ClassCell({ progress, isSelected, onSelect }: ClassCellProps) {
  const missing = progress.total - progress.progress;
  const isComplete = missing <= 0;
  const percentage = Math.floor((progress.progress / progress.total) * 100);

  return (
    <button
      type="button"
      aria-expanded={isSelected}
      aria-label={`${m.progress_class({ class: progress.class })}, ${cellSummary(progress)}`}
      onClick={onSelect}
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-lg border px-3 text-left transition-colors hover:border-cosmo/60 md:h-16 md:flex-col md:items-start md:justify-center md:gap-1.5",
        isSelected
          ? "border-cosmo bg-cosmo/15"
          : isComplete
            ? "border-transparent md:border-border/50 md:bg-muted/30"
            : "border-cosmo/40 bg-cosmo/8",
      )}
    >
      <span className="text-sm font-semibold md:hidden">{progress.class}</span>

      <span className="flex items-center gap-2 max-md:ml-auto md:w-full md:justify-between">
        <span className="font-bold tabular-nums">
          {progress.progress}/{progress.total}
        </span>
        {progress.unobtainable > 0 && (
          <span
            title={m.progress_bonus_title()}
            className="rounded-full bg-cosmo/20 px-1.5 py-0.5 text-xs font-bold text-cosmo-text"
          >
            +{progress.unobtainable}
          </span>
        )}
      </span>

      {isComplete ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <IconCheck className="size-4 text-green-500" aria-hidden />
          <span className="max-md:sr-only">{m.progress_complete()}</span>
        </span>
      ) : (
        <span className="flex flex-col gap-1.5 md:w-full">
          <span className="text-xs font-semibold text-cosmo-text">
            {m.progress_missing_count({ count: missing })}
          </span>
          <span className="block h-1 overflow-hidden rounded-full bg-muted max-md:hidden">
            <span
              className="block h-full bg-cosmo"
              style={{ width: `${percentage}%` }}
            />
          </span>
        </span>
      )}
    </button>
  );
}

function cellSummary(progress: SeasonProgress) {
  const missing = progress.total - progress.progress;
  return [
    m.progress_collected_summary({
      count: progress.progress,
      total: progress.total,
    }),
    missing > 0 && m.progress_missing_count({ count: missing }),
    progress.unobtainable > 0 &&
      m.progress_unobtainable_count({ count: progress.unobtainable }),
  ]
    .filter(Boolean)
    .join(" · ");
}
