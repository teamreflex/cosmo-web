"use client";

import { ReactNode, useTransition } from "react";
import { logout } from "./actions";
import UserDropdown from "./user-dropdown";
import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { useWallet } from "@/hooks/use-wallet";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

type Props = {
  profile: PublicProfile;
  artists: CosmoArtistBFF[];
  selectedArtist: ValidArtist;
  comoBalances: ReactNode;
  cosmoAvatar: ReactNode;
};

export default function StateAuthenticated({
  profile,
  artists,
  selectedArtist,
  comoBalances,
  cosmoAvatar,
}: Props) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { disconnect } = useWallet();

  function signOut() {
    startTransition(async () => {
      disconnect();
      await logout();
    });
  }

  if (isPending) {
    return <Loader2 className="animate-spin" />;
  }

  return (
    <div className="flex gap-2 items-center justify-center">
      <div className="md:flex gap-2 items-center hidden">{comoBalances}</div>

      <UserDropdown
        key={pathname}
        profile={profile}
        artists={artists}
        selectedArtist={selectedArtist}
        comoBalances={comoBalances}
        onSignOut={signOut}
        cosmoAvatar={cosmoAvatar}
      />
    </div>
  );
}
