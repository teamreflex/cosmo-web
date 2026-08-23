import { m } from "@/i18n/messages";
import type { CandidateColorArtist } from "@/lib/client/gravity/colors";
import { resolveSlotColors } from "@/lib/client/gravity/colors";
import type { PollSlotModel, SlotRanking } from "@/lib/client/gravity/slots";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import ComoShare from "./como-share";
import RaceRow from "./race-row";

/** Rows a slot column shows before folding the tail into its footer. */
const VISIBLE_CANDIDATES = 8;

const ROW_TRANSITION = {
  duration: 0.3,
  type: "spring",
  stiffness: 500,
  damping: 30,
} as const;

type Props = {
  model: PollSlotModel;
  rankings: SlotRanking[];
  artist: CandidateColorArtist;
};

/**
 * The poll's races: one column per slot for a combination poll, one full-width
 * race for a single poll.
 */
export default function CandidateBreakdown(props: Props) {
  const columns = useMemo(
    () =>
      props.rankings.map((ranking) => ({
        ranking,
        color: resolveSlotColors(props.artist, props.model, ranking.slot),
      })),
    [props.rankings, props.artist, props.model],
  );

  return (
    <div
      className={cn(
        "grid items-start gap-2",
        columns.length > 1 && "md:grid-cols-2",
      )}
    >
      {columns.map((column, index) => (
        <SlotCard
          key={column.ranking.slot.id}
          ranking={column.ranking}
          color={column.color}
          position={
            props.model.kind === "single"
              ? null
              : { index: index + 1, total: columns.length }
          }
        />
      ))}
    </div>
  );
}

type SlotCardProps = {
  ranking: SlotRanking;
  color: (name: string) => string;
  /** Where the slot sits among the poll's slots; null for a single race. */
  position: { index: number; total: number } | null;
};

function SlotCard(props: SlotCardProps) {
  const [expanded, setExpanded] = useState(false);

  const rows = props.ranking.rows;
  // a single poll races every candidate in one column, so nothing is folded away
  const limit = props.position === null ? rows.length : VISIBLE_CANDIDATES;
  const visible = expanded ? rows : rows.slice(0, limit);
  const tail = rows.slice(limit);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2
          className={cn(
            "min-w-0 truncate text-sm font-semibold",
            props.position !== null && "font-cosmo tracking-wide uppercase",
          )}
        >
          {props.position === null
            ? m.gravity_vote_rankings()
            : props.ranking.slot.name}
        </h2>

        <span className="shrink-0 text-xs text-muted-foreground">
          {props.position === null
            ? m.gravity_candidate_count({ count: rows.length })
            : m.gravity_slot_position({
                index: props.position.index,
                total: props.position.total,
              })}
        </span>
      </div>

      <div className="flex flex-col">
        {visible.map((row) => (
          <motion.div
            key={row.candidate.name}
            layout
            transition={ROW_TRANSITION}
          >
            <RaceRow row={row} color={props.color(row.candidate.name)} />
          </motion.div>
        ))}
      </div>

      {tail.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            m.gravity_show_less()
          ) : (
            <>
              <span>{m.gravity_more_candidates({ count: tail.length })}</span>
              <span aria-hidden>·</span>
              <ComoShare
                como={sum(tail, (row) => row.como)}
                share={sum(tail, (row) => row.share)}
              />
            </>
          )}
        </button>
      )}
    </div>
  );
}

function sum<T>(rows: T[], value: (row: T) => number) {
  return rows.reduce((total, row) => total + value(row), 0);
}
