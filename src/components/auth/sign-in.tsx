import { useState } from "react";
import { LogIn } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
import { env } from "@/lib/env/client";

type State = "sign-in" | "sign-up" | "forgot-password";

export default function SignIn() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("sign-in");

  function onOpenChange(openState: boolean) {
    setOpen(openState);

    if (!openState) {
      // prevents flicker due to animation
      setTimeout(() => {
        setState("sign-in");
      }, 200);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          onClick={() => setOpen(true)}
          variant="link"
          size="icon"
          className="outline-hidden drop-shadow-lg md:mx-2"
          aria-label="Sign In"
        >
          <LogIn className="size-8 shrink-0 md:hidden" />
          <span className="hidden md:contents">Sign In</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full">
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription>
            Sign in to your {env.VITE_APP_NAME} account
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2">
          {(() => {
            switch (state) {
              case "sign-in":
                return (
                  <WithEmail
                    onForgotPassword={() => setState("forgot-password")}
                    onSuccess={() => setOpen(false)}
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

              <div className="flex flex-col items-center gap-2 lg:flex-row">
                <SignInWithDiscord />
                <SignInWithTwitter />
              </div>

              <Link
                to="/terms-privacy"
                onClick={() => setOpen(false)}
                className="pt-2 text-xs text-muted-foreground underline"
              >
                Terms & Privacy
              </Link>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Separator() {
  return (
    <div className="my-2 flex items-center justify-center gap-1">
      <SeparatorLine />
      <span className="text-xs text-muted-foreground">or</span>
      <SeparatorLine />
    </div>
  );
}

function SeparatorLine() {
  return <div className="flex h-px w-24 shrink-0 bg-border" />;
}
