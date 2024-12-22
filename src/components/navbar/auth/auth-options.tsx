"use client";

import { ReactNode, useTransition } from "react";
import { logout } from "./actions";
import { TbLoader2 } from "react-icons/tb";
import { TokenPayload } from "@/lib/universal/auth";
import UserDropdown from "./user-dropdown";
import SignInDialog from "./sign-in/sign-in-dialog";
import { CosmoArtist } from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import GuestThemeSwitch from "./guest-theme-switch";
import Hydrated from "@/components/hydrated";
import { useWallet } from "@/hooks/use-wallet";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { disconnect } = useWallet();

  const isAuthenticated = !!token && !!profile;

  function executeSignOut() {
    startTransition(async () => {
      disconnect();
      await logout();
    });
  }

  if (isAuthenticated) {
    return (
      <div className="flex gap-2 items-center justify-center">
        <div className="md:flex gap-2 items-center hidden">{comoBalances}</div>

        <UserDropdown
          key={pathname}
          profile={profile}
          artists={artists}
          selectedArtist={selectedArtist}
          comoBalances={comoBalances}
          onSignOut={executeSignOut}
          cosmoAvatar={cosmoAvatar}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isPending ? <TbLoader2 className="animate-spin" /> : <SignInDialog />}

      <Hydrated>
        <GuestThemeSwitch />
      </Hydrated>

      {/* <GuestArtistSwitch
      artists={artists}
      selectedArtist={selectedArtist}
    /> */}
    </div>
  );
}
