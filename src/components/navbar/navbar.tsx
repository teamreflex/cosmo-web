import AuthOptions from "./auth/auth-options";
import ApolloLogo from "./apollo-logo";
import { ReactNode } from "react";
import { TokenPayload } from "@/lib/server/jwt";
import { CosmoArtist, ValidArtist } from "@/lib/universal/cosmo";
import Links from "./links";

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
          <div className="container grid grid-cols-3 items-center gap-2 text-sm text-foreground md:gap-4 md:py-6 lg:grid-cols-3 pointer-events-auto">
            <ApolloLogo color="white" />
            <Links />

            <div className="flex items-center justify-end gap-2">
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
