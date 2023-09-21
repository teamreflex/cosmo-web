"use client";

import { getUser, signIn, signOut } from "@ramper/ethereum";
import { Button } from "./ui/button";
import { useAuthStore } from "@/store";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { cosmoLogin } from "@/app/(auth)/login/email/actions";
import { Loader2 } from "lucide-react";

export default function AuthOptions() {
  const [pending, setPending] = useState(true);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  const ramperUser = useAuthStore((state) => state.ramperUser);
  const setRamperUser = useAuthStore((state) => state.setRamperUser);

  const router = useRouter();
  const cosmoForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const user = getUser();
    setRamperUser(user);
    setPending(false);

    if (!user) {
      router.push("/");
    }
  }, [setRamperUser, router]);

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

      <div className="flex items-center justify-center">
        {ramperUser ? (
          <Button variant="link" onClick={executeSignOut}>
            Sign Out
          </Button>
        ) : (
          <>
            {pending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="link">Sign In</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign In</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="text-sm text-muted-foreground">
                        <p>You will be redirected to Ramper to sign in.</p>
                        <p>
                          Make sure to select{" "}
                          <span className="font-semibold underline">
                            confirm from a different device
                          </span>{" "}
                          in the email.
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => executeSignIn()}>
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}
      </div>
    </>
  );
}
