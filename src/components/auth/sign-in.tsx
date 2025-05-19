"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import SignInWithDiscord from "./with-discord";
import WithEmail from "./with-email";
import SignInWithTwitter from "./with-twitter";
import SignUp from "./sign-up";
import ForgotPassword from "./forgot-password";
import { env } from "@/env";

type State = "sign-in" | "sign-up" | "forgot-password";

export default function SignIn() {
  const [state, setState] = useState<State>("sign-in");

  function onOpenChange(open: boolean) {
    if (!open) {
      // prevents flicker due to animation
      setTimeout(() => {
        setState("sign-in");
      }, 500);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="link">Sign In</Button>
      </DialogTrigger>
      <DialogContent className="w-full">
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription>
            Sign in to your {env.NEXT_PUBLIC_APP_NAME} account
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 items-center">
          {(() => {
            switch (state) {
              case "sign-in":
                return (
                  <WithEmail
                    onForgotPassword={() => setState("forgot-password")}
                  />
                );
              case "sign-up":
                return <SignUp onCancel={() => setState("sign-in")} />;
              case "forgot-password":
                return <ForgotPassword onCancel={() => setState("sign-in")} />;
              default:
                return null;
            }
          })()}

          {state === "sign-in" && (
            <div className="contents">
              <Separator />

              <Button variant="link" onClick={() => setState("sign-up")}>
                <span>Create an account</span>
              </Button>

              <Separator />

              <div className="flex flex-col lg:flex-row gap-2 items-center">
                <SignInWithDiscord />
                <SignInWithTwitter />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Separator() {
  return (
    <div className="flex items-center justify-center gap-1 my-2">
      <SeparatorLine />
      <span className="text-xs text-muted-foreground">or</span>
      <SeparatorLine />
    </div>
  );
}

function SeparatorLine() {
  return <div className="flex bg-border shrink-0 h-px w-24" />;
}
