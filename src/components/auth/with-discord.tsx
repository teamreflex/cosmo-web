"use client";

import { authClient } from "@/lib/client/auth";
import { useTransition } from "react";
import { Button } from "../ui/button";

export default function SignInWithDiscord() {
  const [isPending, startTransition] = useTransition();

  function handleRedirect() {
    startTransition(async () => {
      await authClient.signIn.social({ provider: "discord" });
    });
  }

  return (
    <Button className="w-fit" onClick={handleRedirect} disabled={isPending}>
      Sign in with Discord
    </Button>
  );
}
