import UserAvatar from "@/components/profile/user-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHydrated } from "@/hooks/use-hydrated";
import { m } from "@/i18n/messages";
import type {
  AggregatedTopUser,
  AggregatedTopVote,
} from "@/lib/client/gravity/abstract/types";
import type { ChoiceStyle } from "@/lib/client/gravity/colors";
import { cn, type PropsWithClassName } from "@/lib/utils";
import { IconChevronDown, IconQuestionMark } from "@tabler/icons-react";
import { format } from "date-fns";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-client";
import { useMemo, useState, type ReactNode } from "react";
import { ComoAmount } from "./como-share";
import RankNumber from "./rank-number";

const ROW_TRANSITION = {
  duration: 0.3,
  type: "spring",
  stiffness: 500,
  damping: 30,
} as const;

/** A user's vote, once its pick is known. */
type UserVote = AggregatedTopUser["votes"][number];

type Props = {
  topUsers: AggregatedTopUser[];
  topVotes: AggregatedTopVote[];
  /** Label, color and image per on-chain choice, for the picks each row shows. */
  choices: Map<number, ChoiceStyle>;
};

/**
 * The rail's leaderboard: who spent the most COMO, and the biggest single votes.
 */
export default function UserRankings(props: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <Tabs defaultValue="top-users">
        <TabsList className="w-full">
          <TabsTrigger value="top-users">{m.gravity_top_users()}</TabsTrigger>
          <TabsTrigger value="top-votes">{m.gravity_top_votes()}</TabsTrigger>
        </TabsList>

        <TabsContent value="top-users">
          <TopUsers users={props.topUsers} choices={props.choices} />
        </TabsContent>
        <TabsContent value="top-votes">
          <TopVotes votes={props.topVotes} choices={props.choices} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type TopUsersProps = {
  users: AggregatedTopUser[];
  choices: Map<number, ChoiceStyle>;
};

/**
 * Biggest spenders, each opening onto the votes that got them there.
 */
function TopUsers(props: TopUsersProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      props.users.map((user, index) => ({
        key: user.address,
        rank: index + 1,
        name: user.nickname ?? user.address.substring(0, 8),
        como: user.total,
        // newest first: ISO timestamps sort as they read
        votes: user.votes.toSorted((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      })),
    [props.users],
  );

  return (
    <RankingList empty={rows.length === 0}>
      {rows.map((row) => {
        const open = expanded === row.key;

        return (
          <motion.div
            key={row.key}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={ROW_TRANSITION}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setExpanded(open ? null : row.key)}
              className="flex h-9 w-full items-center gap-2 text-left"
            >
              <RankNumber
                rank={row.rank}
                className="w-5 shrink-0 text-center text-xs"
              />

              <span className="relative shrink-0">
                <UserAvatar username={row.name} className="size-7 **:p-1" />
                {row.votes.length > 1 && (
                  <span
                    className="absolute -right-1 -bottom-1 rounded-full bg-secondary px-1 font-mono text-xxs leading-4 text-muted-foreground ring-2 ring-card"
                    title={m.gravity_vote_count({ count: row.votes.length })}
                  >
                    +{row.votes.length - 1}
                  </span>
                )}
              </span>

              <span className="min-w-0 flex-1 truncate text-sm">
                {row.name}
              </span>

              <ComoAmount como={row.como} className="shrink-0 text-xs" />

              <IconChevronDown
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={ROW_TRANSITION}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col pb-1 pl-7">
                    {row.votes.map((vote) => (
                      <VoteRow
                        key={vote.id}
                        vote={vote}
                        choice={pickedChoice(props.choices, vote.candidateId)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </RankingList>
  );
}

type TopVotesProps = {
  votes: AggregatedTopVote[];
  choices: Map<number, ChoiceStyle>;
};

/**
 * The largest single votes, shown as what they picked.
 */
function TopVotes(props: TopVotesProps) {
  const rows = useMemo(
    () =>
      props.votes.map((vote, index) => ({
        key: vote.id,
        rank: index + 1,
        name: vote.username ?? vote.voter.substring(0, 8),
        como: vote.comoAmount,
        choice: pickedChoice(props.choices, vote.candidateId),
      })),
    [props.votes, props.choices],
  );

  return (
    <RankingList empty={rows.length === 0}>
      {rows.map((row) => (
        <motion.div
          key={row.key}
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={ROW_TRANSITION}
          className="flex h-9 items-center gap-2"
        >
          <RankNumber
            rank={row.rank}
            className="w-5 shrink-0 text-center text-xs"
          />

          <ChoiceAvatar choice={row.choice} className="size-7" />

          <span className="min-w-0 flex-1 truncate text-sm">{row.name}</span>

          <ComoAmount como={row.como} className="shrink-0 text-xs" />
        </motion.div>
      ))}
    </RankingList>
  );
}

/**
 * One vote inside a user's row: when it was cast, what it picked, and its COMO.
 */
function VoteRow({
  vote,
  choice,
}: {
  vote: UserVote;
  choice: ChoiceStyle | undefined;
}) {
  return (
    <div className="flex h-8 items-center gap-2">
      <VoteTime date={new Date(vote.createdAt)} />

      <ChoiceAvatar choice={choice} className="size-6" />

      <span className="min-w-0 flex-1 truncate text-xs">
        {choice?.label ?? m.gravity_unrevealed()}
      </span>

      <ComoAmount como={vote.amount} className="shrink-0 text-xs" />
    </div>
  );
}

function RankingList({
  empty,
  children,
}: {
  empty: boolean;
  children: ReactNode;
}) {
  if (empty) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        {m.gravity_no_votes_yet()}
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </div>
  );
}

/**
 * What a vote picked, or a question mark while it stays sealed.
 */
function ChoiceAvatar({
  choice,
  className,
}: PropsWithClassName<{ choice: ChoiceStyle | undefined }>) {
  if (choice === undefined) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-muted",
          className,
        )}
        title={m.gravity_unrevealed()}
      >
        <IconQuestionMark className="size-3.5 text-muted-foreground" />
      </span>
    );
  }

  return (
    <Avatar className={cn("shrink-0", className)}>
      <AvatarFallback>{choice.label.charAt(0)}</AvatarFallback>
      <AvatarImage src={choice.imageUrl} alt={choice.label} />
    </Avatar>
  );
}

/**
 * When a vote was cast, in the viewer's timezone.
 */
function VoteTime({ date }: { date: Date }) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return <Skeleton className="h-7 w-10 shrink-0 rounded-md" />;
  }

  return (
    <span className="flex w-10 shrink-0 flex-col font-mono text-xxs leading-tight text-muted-foreground">
      <span>{format(date, "MMM d")}</span>
      <span>{format(date, "HH:mm")}</span>
    </span>
  );
}

/**
 * The choice a vote landed on; undefined while the vote is unrevealed.
 */
function pickedChoice(
  choices: Map<number, ChoiceStyle>,
  candidateId: number | null,
) {
  return candidateId === null ? undefined : choices.get(candidateId);
}
