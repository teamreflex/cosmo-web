import { m } from "@/i18n/messages";
import type { SeasonProgress } from "@/lib/universal/progress";
import { cn } from "@/lib/utils";
import type { ValidOnlineType } from "@apollo/cosmo/types/common";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useId, useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import ProgressObjektGrid from "./progress-objekt-grid";
import { ProgressTypeSelect } from "./progress-type-filter";

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
 * Below lg each season stacks its classes, as cards on tablets and rows on phones.
 */
export default function ProgressBreakdown(props: Props) {
  const [selected, setSelected] = useState<string>();
  const [hideComplete, setHideComplete] = useState(false);
  const hideCompleteId = useId();

  const rows = hideComplete
    ? props.rows.filter((row) => row.owned < row.total)
    : props.rows;

  return (
    <div
      style={{ "--class-count": props.classes.length }}
      className="flex flex-col gap-3 [--breakdown-cols:8rem_repeat(var(--class-count),minmax(0,1fr))_6rem]"
    >
      {/* phones put the switch on its own row under the heading and type */}
      <div className="flex h-21 flex-wrap items-center gap-x-5 gap-y-1 sm:h-11">
        <h2 className="mr-auto font-cosmo text-lg uppercase">
          {m.progress_breakdown()}
        </h2>
        <div className="flex h-11 items-center gap-2 max-sm:order-last max-sm:w-full">
          <Switch
            id={hideCompleteId}
            checked={hideComplete}
            onCheckedChange={setHideComplete}
          />
          <Label
            htmlFor={hideCompleteId}
            className="cursor-pointer text-sm font-semibold"
          >
            {m.progress_hide_complete()}
          </Label>
        </div>
        <ProgressTypeSelect
          className="min-w-32"
          value={props.onlineType}
          onChange={props.setOnlineType}
        />
      </div>

      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        <div className="hidden grid-cols-(--breakdown-cols) gap-2 px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:grid">
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
    <div>
      <div className="flex flex-col gap-1 p-2 sm:grid sm:grid-cols-3 sm:gap-2 sm:p-4 lg:grid-cols-(--breakdown-cols) lg:items-center lg:py-2.5">
        {/* below lg the season and its total are a header, the table splits them into the first and last columns */}
        <div className="flex items-baseline justify-between px-2 pt-2 pb-1 sm:col-span-full sm:p-0 lg:contents">
          <h3 className="font-cosmo uppercase">{row.season}</h3>
          <p className="flex items-baseline gap-2 text-sm lg:order-last lg:flex-col lg:items-end lg:gap-0.5">
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
              className="hidden h-16 items-center px-3 text-muted-foreground/40 lg:flex"
            >
              <span aria-hidden>—</span>
              <span className="sr-only">{m.progress_not_released()}</span>
            </span>
          );
        })}
      </div>

      {open && (
        <div className="mx-2 mb-2 flex flex-col gap-4 rounded-lg border border-cosmo/35 bg-background/50 p-3 sm:mx-4 sm:mb-4 sm:p-5">
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
        "flex min-h-12 items-center gap-3 rounded-lg border px-3 text-left transition-colors hover:border-cosmo/60 sm:flex-col sm:items-start sm:gap-1.5 sm:py-3 lg:h-16 lg:justify-center lg:py-0",
        isSelected
          ? "border-cosmo bg-cosmo/15"
          : isComplete
            ? "border-transparent sm:border-border/50 sm:bg-muted/30"
            : "border-cosmo/40 bg-cosmo/8",
      )}
    >
      <span className="text-sm font-semibold sm:text-xs sm:tracking-wide sm:text-muted-foreground sm:uppercase lg:hidden">
        {progress.class}
      </span>

      <span className="flex items-center gap-2 max-sm:ml-auto sm:w-full sm:justify-between">
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
          <span className="max-sm:sr-only">{m.progress_complete()}</span>
        </span>
      ) : (
        <span className="flex flex-col gap-1.5 sm:w-full">
          <span className="text-xs font-semibold text-cosmo-text">
            {m.progress_missing_count({ count: missing })}
          </span>
          <span className="block h-1 overflow-hidden rounded-full bg-muted max-sm:hidden">
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
