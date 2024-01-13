"use client";

import { signIn, signOut } from "@ramper/ethereum";
import { ReactNode, useTransition } from "react";
import { cosmoLogin, logout } from "./actions";
import { Loader2 } from "lucide-react";
import { TokenPayload } from "@/lib/universal/auth";
import UserDropdown from "./user-dropdown";
import SignInDialog from "./sign-in-dialog";
import { CosmoArtist } from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { PublicProfile } from "@/lib/universal/cosmo/auth";

type Props = {
  user: TokenPayload | undefined;
  profile: PublicProfile | undefined;
  artists: CosmoArtist[];
  selectedArtist: ValidArtist | undefined;
  comoBalances: ReactNode;
};

export default function AuthOptions({
  user,
  profile,
  artists,
  selectedArtist,
  comoBalances,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function ramperLogin() {
    startTransition(async () => {
      const result = await signIn();
      if (result.method === "ramper" && result.user) {
        const email = result.user.email;
        const token = result.user.ramperCredential?.idToken;
        if (email && token) {
          await cosmoLogin(email, token);
        }
      }
    });
  }

  function executeSignOut() {
    startTransition(async () => {
      signOut();
      await logout();
    });
  }

  return (
    <>
      {user && profile ? (
        <div className="flex gap-2 items-center justify-center">
          <div className="md:flex gap-2 items-center hidden">
            {comoBalances}
          </div>
          <UserDropdown
            user={user}
            profile={profile}
            artists={artists}
            selectedArtist={selectedArtist}
            comoBalances={comoBalances}
            onSignOut={executeSignOut}
          />
        </div>
      ) : (
        <div className="flex items-center">
          {isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <SignInDialog onClick={ramperLogin} />
          )}
        </div>
      )}
    </>
  );
}
