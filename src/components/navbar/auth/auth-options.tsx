"use client";

import { ReactNode, useTransition } from "react";
import { logout } from "./actions";
import { Loader2 } from "lucide-react";
import { TokenPayload } from "@/lib/universal/auth";
import UserDropdown from "./user-dropdown";
import SignInDialog from "./sign-in/sign-in-dialog";
import { CosmoArtist } from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import GuestThemeSwitch from "./guest-theme-switch";
import Hydrated from "@/components/hydrated";
// import GuestArtistSwitch from "./guest-artist-switch";

type Props = {
  token: TokenPayload | undefined;
  profile: PublicProfile | undefined;
  artists: CosmoArtist[];
  selectedArtist: ValidArtist;
  comoBalances: ReactNode;
  cosmoAvatar: ReactNode;
};

export default function AuthOptions({
  token,
  profile,
  artists,
  selectedArtist,
  comoBalances,
  cosmoAvatar,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const isAuthenticated = !!token && !!profile;

  function executeSignOut() {
    startTransition(async () => {
      await logout();
    });
  }

  return (
    <>
      {isAuthenticated ? (
        <div className="flex gap-2 items-center justify-center">
          <div className="md:flex gap-2 items-center hidden">
            {comoBalances}
          </div>

          <UserDropdown
            token={token}
            profile={profile}
            artists={artists}
            selectedArtist={selectedArtist}
            comoBalances={comoBalances}
            onSignOut={executeSignOut}
            cosmoAvatar={cosmoAvatar}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {isPending ? <Loader2 className="animate-spin" /> : <SignInDialog />}

          <Hydrated>
            <GuestThemeSwitch />
          </Hydrated>

          {/* <GuestArtistSwitch
            artists={artists}
            selectedArtist={selectedArtist}
          /> */}
        </div>
      )}
    </>
  );
}
