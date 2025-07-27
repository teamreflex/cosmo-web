"use client";

import { Activity, CircleCheckBig, Loader2 } from "lucide-react";
import type { LiveStatus } from "@/lib/client/gravity/abstract/types";

type StatusProps = {
  liveStatus: LiveStatus;
  isRefreshing?: boolean;
};

export default function GravityStatus({ liveStatus, isRefreshing = false }: StatusProps) {
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