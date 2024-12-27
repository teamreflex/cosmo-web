"use client";

import { useUserState } from "@/hooks/use-user-state";
import { cosmo } from "@/lib/server/http";
import { COSMO_ENDPOINT, ValidArtist } from "@/lib/universal/cosmo/common";
import { CosmoRewardAvailable } from "@/lib/universal/cosmo/rewards";
import { IconHeartExclamation } from "@tabler/icons-react";
import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  ButtonHTMLAttributes,
  forwardRef,
  PropsWithChildren,
  Suspense,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { RefreshCcw } from "lucide-react";
import RewardsDialog from "./rewards-dialog";
import { cn } from "@/lib/utils";

export default function RewardsAvailable() {
  const { artist, token } = useUserState();
  if (!token) return null;

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <TooltipProvider delayDuration={0}>
              <Tooltip open={true}>
                <TooltipTrigger asChild>
                  <RewardButton
                    onClick={() => resetErrorBoundary()}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    <RefreshCcw className="text-destructive-foreground size-8" />
                  </RewardButton>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Retry checking for rewards</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        >
          <Suspense
            fallback={
              <TooltipProvider delayDuration={0}>
                <Tooltip open={true}>
                  <TooltipTrigger asChild>
                    <RewardButton>
                      <RefreshCcw className="text-white animate-spin size-8" />
                    </RewardButton>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Checking for rewards...</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            }
          >
            <CheckRewards artist={artist} token={token.accessToken} />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

type CheckRewardsProps = {
  artist: ValidArtist;
  token: string;
};

function CheckRewards({ artist, token }: CheckRewardsProps) {
  const { data } = useSuspenseQuery({
    queryKey: ["rewards-claimable", artist],
    queryFn: async () => {
      const endpoint = new URL("/bff/v1/check-event-rewards", COSMO_ENDPOINT);
      return await cosmo<CosmoRewardAvailable>(endpoint.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        query: {
          tid: crypto.randomUUID(),
          artistName: artist,
        },
      });
    },
  });

  if (data.isClaimable) {
    return (
      <RewardsDialog artist={artist} token={token}>
        <RewardButton>
          <IconHeartExclamation className="text-white size-8" />
        </RewardButton>
      </RewardsDialog>
    );
  }
}

const RewardButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        "flex items-center justify-center p-1 rounded-full bg-cosmo hover:bg-cosmo-hover transition-colors size-12 aspect-square drop-shadow-sm ring-0",
        className
      )}
    >
      {children}
    </button>
  );
});
RewardButton.displayName = "RewardButton";
