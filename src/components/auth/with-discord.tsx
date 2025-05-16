"use client";

import { authClient } from "@/lib/client/auth";
import { useTransition } from "react";
import { Button } from "../ui/button";
import { IconBrandDiscordFilled } from "@tabler/icons-react";

export default function SignInWithDiscord() {
  const [isPending, startTransition] = useTransition();

  function handleRedirect() {
    startTransition(async () => {
      await authClient.signIn.social({ provider: "discord" });
    });
  }

  return (
    <Button
      className="w-fit"
      variant="discord"
      onClick={handleRedirect}
      disabled={isPending}
    >
      <IconBrandDiscordFilled className="size-5" />
      <span>Sign in with Discord</span>
    </Button>
  );
}
