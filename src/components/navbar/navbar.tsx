import AuthOptions from "./auth/auth-options";
import ApolloLogo from "./apollo-logo";
import { Suspense } from "react";
import Links from "./links";
import {
  decodeUser,
  getArtistsWithMembers,
  getProfile,
} from "@/app/data-fetching";
import UpdateDialog from "../misc/update-dialog";
import ComoBalanceRenderer from "./como-balances";
import { TokenPayload } from "@/lib/universal/auth";
import { user } from "@/lib/server/cosmo/auth";
import { getSelectedArtist } from "@/lib/server/profiles";
import { ErrorBoundary } from "react-error-boundary";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "../ui/tooltip";
import { AlertTriangle } from "lucide-react";
import SystemStatus from "../misc/system-status";
import CosmoAvatar from "./auth/cosmo-avatar";

export default async function Navbar() {
  const user = await decodeUser();

  return (
    <nav className="sticky left-0 right-0 top-0 h-14 z-30">
      <div className="glass">
        <div className="flex w-full items-center h-14">
          <div className="container lg:grid lg:grid-cols-3 flex items-center gap-2 text-sm text-foreground lg:gap-4 lg:py-6 pointer-events-auto">
            <div className="flex gap-4 items-center">
              <ApolloLogo />
              <div className="relative flex divide-x divide-border items-center">
                <SystemStatus />
                <UpdateDialog />
              </div>
            </div>

            <Links user={user} />

            <div className="flex grow-0 items-center justify-end gap-2">
              <ErrorBoundary fallback={<AuthFallback />}>
                <Suspense
                  fallback={
                    <div className="h-10 w-10 rounded-full bg-accent animate-pulse" />
                  }
                >
                  <Auth token={user} />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
      <div className="glass-edge"></div>
    </nav>
  );
}

async function Auth({ token }: { token?: TokenPayload }) {
  const selectedArtist = getSelectedArtist();
  const [artists, profile] = await Promise.all([
    getArtistsWithMembers(),
    token ? getProfile(token.profileId) : undefined,
  ]);

  return (
    <AuthOptions
      token={token}
      profile={profile}
      artists={artists}
      selectedArtist={selectedArtist}
      comoBalances={
        token ? <ComoBalanceRenderer address={token.address} /> : null
      }
      cosmoAvatar={
        <ErrorBoundary fallback={<AuthFallback />}>
          <CosmoAvatar token={token} artist={selectedArtist} />
        </ErrorBoundary>
      }
    />
  );
}

function AuthFallback() {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex justify-center items-center py-1 px-2 rounded-xl bg-red-500 bg-opacity-25 hover:bg-opacity-40 transition-colors">
            <AlertTriangle className="text-red-500 w-6 h-6" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          Error loading user from COSMO
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
