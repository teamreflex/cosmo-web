import UserAvatar from "@/components/profile/user-avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { m } from "@/i18n/messages";
import type {
  AggregatedTopUser,
  AggregatedTopVote,
} from "@/lib/client/gravity/abstract/types";
import type { ChoiceStyle } from "@/lib/client/gravity/colors";
import { IconQuestionMark } from "@tabler/icons-react";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-client";
import { useMemo } from "react";
import RankNumber from "./rank-number";

const ROW_TRANSITION = {
  duration: 0.3,
  type: "spring",
  stiffness: 500,
  damping: 30,
} as const;

type Ranking = {
  key: string;
  rank: number;
  name: string;
  como: number;
  /** The pick's color; undefined while the pick is still unrevealed. */
  color: string | undefined;
};

type Props = {
  topUsers: AggregatedTopUser[];
  topVotes: AggregatedTopVote[];
  /** Color per on-chain choice, for the pick ringing each avatar. */
  choices: Map<number, ChoiceStyle>;
};

/**
 * The rail's leaderboard: who spent the most COMO, and the biggest single votes.
 */
export default function UserRankings(props: Props) {
  const users = useMemo(
    (): Ranking[] =>
      props.topUsers.map((user, index) => {
        const pick = topPick(user.votes);

        return {
          key: user.address,
          rank: index + 1,
          name: user.nickname ?? truncateAddress(user.address),
          como: user.total,
          color:
            pick === undefined ? undefined : props.choices.get(pick)?.color,
        };
      }),
    [props.topUsers, props.choices],
  );

  const votes = useMemo(
    (): Ranking[] =>
      props.topVotes.map((vote, index) => ({
        key: vote.id,
        rank: index + 1,
        name: vote.username ?? truncateAddress(vote.voter),
        como: vote.comoAmount,
        color:
          vote.candidateId === null
            ? undefined
            : props.choices.get(vote.candidateId)?.color,
      })),
    [props.topVotes, props.choices],
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <h2 className="text-sm font-semibold">{m.gravity_user_rankings()}</h2>

      <Tabs defaultValue="top-users">
        <TabsList className="w-full">
          <TabsTrigger value="top-users">{m.gravity_top_users()}</TabsTrigger>
          <TabsTrigger value="top-votes">{m.gravity_top_votes()}</TabsTrigger>
        </TabsList>

        <TabsContent value="top-users">
          <RankingList rows={users} />
        </TabsContent>
        <TabsContent value="top-votes">
          <RankingList rows={votes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RankingList({ rows }: { rows: Ranking[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        {m.gravity_no_votes_yet()}
      </p>
    );
  }

  return (
    <div className="flex max-h-120 flex-col overflow-y-auto">
      <AnimatePresence initial={false}>
        {rows.map((row) => (
          <motion.div
            key={row.key}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={ROW_TRANSITION}
          >
            <Row row={row} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Row({ row }: { row: Ranking }) {
  return (
    <div
      className="flex h-9 items-center gap-2"
      style={{ "--pick-color": row.color }}
    >
      <RankNumber
        rank={row.rank}
        className="w-5 shrink-0 text-center text-xs"
      />

      {row.color === undefined ? (
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted"
          title={m.gravity_unrevealed()}
        >
          <IconQuestionMark className="size-4 text-muted-foreground" />
        </span>
      ) : (
        <UserAvatar
          username={row.name}
          className="size-7 shrink-0 ring-2 ring-(--pick-color) **:p-1"
        />
      )}

      <span className="min-w-0 flex-1 truncate text-sm">{row.name}</span>

      <span className="shrink-0 font-mono text-xs">
        {row.como.toLocaleString()} {m.common_como()}
      </span>
    </div>
  );
}

/**
 * The candidate a user put the most revealed COMO on.
 */
function topPick(votes: AggregatedTopUser["votes"]) {
  const totals = new Map<number, number>();
  for (const vote of votes) {
    if (vote.candidateId === null) continue;
    totals.set(
      vote.candidateId,
      (totals.get(vote.candidateId) ?? 0) + vote.amount,
    );
  }

  let pick: { candidateId: number; como: number } | undefined;
  for (const [candidateId, como] of totals) {
    if (pick === undefined || como > pick.como) {
      pick = { candidateId, como };
    }
  }

  return pick?.candidateId;
}

/**
 * Address shown in place of a username nobody has claimed.
 */
function truncateAddress(address: string) {
  return address.substring(0, 8);
}
