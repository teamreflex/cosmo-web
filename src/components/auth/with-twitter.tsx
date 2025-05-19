"use client";

import { authClient } from "@/lib/client/auth";
import { useTransition } from "react";
import { Button } from "../ui/button";
import { IconBrandTwitterFilled } from "@tabler/icons-react";
import { track } from "@/lib/utils";

export default function SignInWithTwitter() {
  const [isPending, startTransition] = useTransition();

  function handleRedirect() {
    startTransition(async () => {
      await authClient.signIn.social({
        provider: "twitter",
        fetchOptions: {
          onSuccess: () => {
            track("sign-in");
          },
        },
      });
    });
  }

  return (
    <Button
      className="w-fit"
      variant="twitter"
      onClick={handleRedirect}
      disabled={isPending}
    >
      <IconBrandTwitterFilled className="size-5" />
      <span>Sign in with Twitter</span>
    </Button>
  );
}
