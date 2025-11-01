import { Activity, CircleCheckBig, Loader2 } from "lucide-react";
import type { LiveStatus } from "@/lib/client/gravity/abstract/types";
import { m } from "@/i18n/messages";

type StatusProps = {
  liveStatus: LiveStatus;
  isRefreshing?: boolean;
};

export default function GravityStatus({
  liveStatus,
  isRefreshing = false,
}: StatusProps) {
  const statusConfig = getStatusConfig();
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

function getStatusConfig() {
  return {
    voting: {
      icon: <Activity className="size-5 text-cosmo" />,
      text: m.gravity_status_voting(),
    },
    live: {
      icon: (
        <div className="aspect-square size-3 animate-pulse rounded-full bg-red-500" />
      ),
      text: m.gravity_status_live(),
    },
    finalized: {
      icon: <CircleCheckBig className="size-4 text-green-500" />,
      text: m.gravity_status_complete(),
    },
  } as const;
}
