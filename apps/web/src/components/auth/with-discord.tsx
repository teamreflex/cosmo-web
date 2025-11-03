import { useTransition } from "react";
import { IconBrandDiscordFilled } from "@tabler/icons-react";
import { Button } from "../ui/button";
import { authClient } from "@/lib/client/auth";
import { track } from "@/lib/utils";
import { m } from "@/i18n/messages";

export default function SignInWithDiscord() {
  const [isPending, startTransition] = useTransition();

  function handleRedirect() {
    startTransition(async () => {
      await authClient.signIn.social({
        provider: "discord",
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
      variant="discord"
      onClick={handleRedirect}
      disabled={isPending}
    >
      <IconBrandDiscordFilled className="size-5" />
      <span>{m.auth_sign_in_with_discord()}</span>
    </Button>
  );
}
