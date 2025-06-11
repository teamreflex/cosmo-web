"use client";

import type { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import CandidateBreakdown from "./candidate-breakdown";
import { useChainData } from "@/lib/client/gravity/abstract/hooks";
import { useMemo } from "react";
import type {
  CosmoOngoingGravity,
  CosmoPastGravity,
} from "@/lib/universal/cosmo/gravity";
import { useGravityPoll } from "@/lib/client/gravity/common";
import { findPoll } from "@/lib/client/gravity/util";
import GravitySkeleton from "../gravity-skeleton";
import { Activity, AlertTriangle, CircleCheckBig, Loader2 } from "lucide-react";
import Portal from "@/components/portal";
import type { LiveStatus } from "@/lib/client/gravity/abstract/types";

type Props = {
  artist: CosmoArtistBFF;
  gravity: CosmoOngoingGravity | CosmoPastGravity;
};

export default function AbstractLiveChart({ artist, gravity }: Props) {
  const { data: poll } = useGravityPoll({
    artistName: artist.id,
    tokenId: BigInt(artist.comoTokenId),
    gravityId: gravity.id,
    pollId: findPoll(gravity).poll.id,
  });
  const chain = useChainData({
    startDate: poll.startDate,
    endDate: poll.endDate,
    tokenId: BigInt(artist.comoTokenId),
    pollId: BigInt(poll.id),
  });

  // get the number of como used for each candidate
  const { comoByCandidate, comoUsed } = useMemo(() => {
    const comoByCandidate: Record<string, number> = {};
    if (chain.status !== "success") {
      return { comoByCandidate, comoUsed: 0 };
    }

    let comoUsed = 0;
    for (let i = 0; i < poll.pollViewMetadata.selectedContent.length; i++) {
      const chainComo = chain.comoPerCandidate?.[i] ?? 0;
      comoByCandidate[i] = chainComo;
      comoUsed += chainComo;
    }
    return { comoByCandidate, comoUsed };
  }, [poll.pollViewMetadata.selectedContent, chain]);

  const percentageCounted =
    chain.status === "success"
      ? Math.round(
          ((chain.totalVotesCount - chain.remainingVotesCount) /
            chain.totalVotesCount) *
            100
        )
      : 0;

  if (chain.status === "pending") {
    return <GravitySkeleton />;
  }

  if (chain.status === "error") {
    return (
      <div className="flex flex-col w-full gap-2">
        <AlertTriangle className="size-12" />
        <p className="text-sm font-semibold">Error loading gravity</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-2">
      <CandidateBreakdown
        content={poll.pollViewMetadata.selectedContent}
        comoByCandidate={comoByCandidate}
        totalComoUsed={comoUsed}
        liveStatus={chain.liveStatus}
        isRefreshing={chain.isRefreshing}
      />

      <Portal to="#gravity-status">
        <div className="flex flex-col items-end">
          <Status
            liveStatus={chain.liveStatus}
            isRefreshing={chain.isRefreshing}
          />
          <p className="text-xs font-semibold">
            {chain.totalVotesCount - chain.remainingVotesCount}/
            {chain.totalVotesCount} ({percentageCounted}%)
          </p>
        </div>
      </Portal>
    </div>
  );
}

type StatusProps = {
  liveStatus: LiveStatus;
  isRefreshing: boolean;
};

function Status({ liveStatus, isRefreshing }: StatusProps) {
  const config = statusConfig[liveStatus];

  return (
    <div className="flex items-center gap-2">
      <span>
        {isRefreshing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          config.icon
        )}
      </span>
      <p className="text-sm font-semibold">{config.text}</p>
    </div>
  );
}

const statusConfig = {
  voting: {
    icon: <Activity className="size-5 text-cosmo" />,
    text: "VOTING",
  },
  live: {
    icon: (
      <div className="aspect-square size-3 bg-red-500 rounded-full animate-pulse" />
    ),
    text: "LIVE",
  },
  finalized: {
    icon: <CircleCheckBig className="size-4 text-green-500" />,
    text: "COMPLETE",
  },
} as const;
