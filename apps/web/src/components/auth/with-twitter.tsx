import { useTransition } from "react";
import { IconBrandTwitterFilled } from "@tabler/icons-react";
import { Button } from "../ui/button";
import { authClient } from "@/lib/client/auth";
import { track } from "@/lib/utils";
import { m } from "@/i18n/messages";

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
      <span>{m.auth_sign_in_with_twitter()}</span>
    </Button>
  );
}
