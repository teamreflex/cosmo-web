"use client";

import { getUser, signIn, signOut } from "@ramper/ethereum";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";
import { ReactNode, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cosmoLogin } from "./actions";
import { Loader2, LogIn } from "lucide-react";
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
  const [pending, setPending] = useState(true);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  const setRamperUser = useAuthStore((state) => state.setRamperUser);

  const cosmoForm = useRef<HTMLFormElement>(null);

  // initialize ramper sdk
  useEffect(() => {
    const ramper = getUser();
    setRamperUser(ramper);
    setPending(false);
  }, [setRamperUser, user]);

  // login with cosmo when the ramper login is complete
  useEffect(() => {
    if (cosmoForm.current && email && token) {
      cosmoForm.current.requestSubmit();
    }
  }, [email, token]);

  async function executeSignIn() {
    setPending(true);
    const result = await signIn();
    if (result.method === "ramper" && result.user) {
      setRamperUser(result.user);

      const token = result.user.ramperCredential?.idToken;
      if (token && cosmoForm.current) {
        setEmail(result.user.email!);
        setToken(token);
      }
    }
  }

  async function executeCosmoLogin(formData: FormData) {
    await cosmoLogin(formData);
    setPending(false);
  }

  async function executeSignOut() {
    signOut();
    setRamperUser(null);
    setPending(false);
  }

  return (
    <>
      <form hidden action={executeCosmoLogin} ref={cosmoForm}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="token" value={token} />
      </form>

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
          {pending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <SignInDialog onClick={executeSignIn} />
          )}
        </div>
      )}
    </>
  );
}
