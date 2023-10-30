"use client";

import { getUser, signIn, signOut } from "@ramper/ethereum";
import { useAuthStore } from "@/store";
import { ReactNode, useEffect, useTransition } from "react";
import { cosmoLogin, logout } from "./actions";
import { Loader2 } from "lucide-react";
import { TokenPayload } from "@/lib/server/jwt";
import { CosmoArtist } from "@/lib/server/cosmo";
import { ValidArtist } from "@/lib/server/cosmo/common";
import UserDropdown from "./user-dropdown";
import SignInDialog from "./sign-in-dialog";

type Props = {
  user: TokenPayload | undefined;
  artists: CosmoArtist[];
  selectedArtist: ValidArtist | undefined;
  comoBalances: ReactNode;
};

export default function AuthOptions({
  user,
  artists,
  selectedArtist,
  comoBalances,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const setRamperUser = useAuthStore((state) => state.setRamperUser);

  // initialize ramper sdk
  useEffect(() => {
    startTransition(() => {
      const ramper = getUser();
      setRamperUser(ramper);
    });
  }, [setRamperUser, user]);

  function ramperLogin() {
    startTransition(async () => {
      const result = await signIn();
      if (result.method === "ramper" && result.user) {
        setRamperUser(result.user);

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
      setRamperUser(null);
      await logout();
    });
  }

  return (
    <>
      {user ? (
        <div className="flex gap-2 items-center justify-center">
          <div className="md:flex gap-2 items-center hidden">
            {comoBalances}
          </div>
          <UserDropdown
            user={user}
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
