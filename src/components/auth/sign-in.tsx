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
import { Separator } from "../ui/separator";
import SignInWithDiscord from "./with-discord";
import WithEmail from "./with-email";
import SignInWithTwitter from "./with-twitter";
import SignUp from "./sign-up";
import { match } from "ts-pattern";
import ForgotPassword from "./forgot-password";

type State = "sign-in" | "sign-up" | "forgot-password";

export default function SignIn() {
  const [state, setState] = useState<State>("sign-in");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link">Sign In</Button>
      </DialogTrigger>
      <DialogContent className="w-full">
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription>
            Sign in to your account to continue
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 items-center">
          {match(state)
            .with("sign-in", () => (
              <WithEmail onForgotPassword={() => setState("forgot-password")} />
            ))
            .with("sign-up", () => (
              <SignUp onCancel={() => setState("sign-in")} />
            ))
            .with("forgot-password", () => (
              <ForgotPassword onCancel={() => setState("sign-in")} />
            ))
            .exhaustive()}

          {state === "sign-in" && (
            <div className="contents">
              <Separator className="my-4" />

              <Button onClick={() => setState("sign-up")}>
                <span>Create an account</span>
              </Button>
            </div>
          )}

          <Separator className="my-4" />

          <div className="flex gap-2 items-center">
            <SignInWithDiscord />
            <SignInWithTwitter />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
