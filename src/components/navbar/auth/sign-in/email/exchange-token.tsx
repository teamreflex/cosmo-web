import { useState, useTransition } from "react";
import { EmailSignInPayload } from "./common";
import { exchangeRamperToken } from "./actions";
import { track } from "@/lib/utils";
import Portal from "@/components/portal";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { UserState } from "@/hooks/use-wallet";
import { useInterval } from "usehooks-ts";

type Props = {
  payload: EmailSignInPayload;
  onBack: () => void;
  onComplete: (userState: UserState) => void;
};

export default function ExchangeTokenForm({
  payload,
  onBack,
  onComplete,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [count, setCount] = useState(10);

  useInterval(
    () => {
      setCount((c) => c - 1);
    },
    count > 0 ? 1000 : null
  );

  async function submit(form: FormData) {
    startTransition(async () => {
      const result = await exchangeRamperToken(form);

      switch (result.status) {
        case "error":
          setError(result.error);
          break;
        case "success":
          track("sign-in");
          onComplete(result.data);
          break;
      }
    });
  }

  const emailDomain = payload.email.split("@")[1];
  const enableSubmission = count <= 0;
  const realCount = count < 0 ? 0 : count;

  return (
    <form action={submit} className="flex flex-col gap-2" id="token-submit">
      <input type="hidden" name="transactionId" value={payload.transactionId} />
      <input type="hidden" name="email" value={payload.email} />
      <input type="hidden" name="pendingToken" value={payload.pendingToken} />

      <p className="text-sm text-muted-foreground">
        A COSMO login email has been sent to your{" "}
        <span className="font-semibold">{emailDomain}</span> address.
      </p>

      <p className="text-sm text-muted-foreground">
        Make sure to select{" "}
        <span className="font-semibold underline text-red-500">
          confirm from a different device
        </span>{" "}
        in the email.
      </p>

      <p className="text-sm text-muted-foreground font-semibold">
        Once you have received the email and clicked the link, return here and
        hit the &quot;Sign In&quot; button.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Portal to="#sign-in-footer">
        <Button type="button" onClick={onBack} variant="ghost">
          Back
        </Button>

        <Button
          type="submit"
          disabled={isPending || !enableSubmission}
          form="token-submit"
        >
          <span>{enableSubmission ? "Sign In" : `Sign In (${realCount})`}</span>
          {isPending && <Loader2 className="size-4 ml-2 animate-spin" />}
        </Button>
      </Portal>
    </form>
  );
}
