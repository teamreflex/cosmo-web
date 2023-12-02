import AuthOptions from "./auth/auth-options";
import ApolloLogo from "./apollo-logo";
import { ReactNode, Suspense } from "react";
import { TokenPayload } from "@/lib/universal/auth";
import Links from "./links";
import GasDisplay from "../misc/gas-display";
import { CosmoArtist } from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";

type Props = {
  user: TokenPayload | undefined;
  artists: CosmoArtist[];
  selectedArtist: ValidArtist | undefined;
  comoBalances: ReactNode;
};

export default function Navbar({
  user,
  artists,
  selectedArtist,
  comoBalances,
}: Props) {
  return (
    <nav className="sticky left-0 right-0 top-0 h-14 z-10">
      <div className="glass">
        <div className="flex w-full items-center h-14">
          <div className="container sm:grid sm:grid-cols-3 flex items-center gap-2 text-sm text-foreground md:gap-4 md:py-6 pointer-events-auto">
            <div className="flex gap-4 items-center">
              <ApolloLogo color="white" />
              <Suspense
                fallback={
                  <div className="w-12 h-6 rounded-lg bg-accent animate-pulse" />
                }
              >
                <GasDisplay />
              </Suspense>
            </div>

            <Links />

            <div className="flex grow-0 items-center justify-end gap-2">
              <AuthOptions
                user={user}
                artists={artists}
                selectedArtist={selectedArtist}
                comoBalances={comoBalances}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="glass-edge"></div>
    </nav>
  );
}
