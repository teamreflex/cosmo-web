import Portal from "@/components/portal";
import {
  AlertDialogCancel,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/utils";
import { useEffect, useState, useTransition } from "react";
import { exchangeRamperToken, sendRamperEmail } from "./actions";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type SignInState = "sending-email" | "exchanging-token";
type Payload = {
  transactionId: string;
  email: string;
  pendingToken: string;
};

export default function SignInWithEmail() {
  const [state, setState] = useState<SignInState>("sending-email");
  const [payload, setPayload] = useState({
    transactionId: crypto.randomUUID(),
    email: "",
    pendingToken: "",
  });

  function emailSent(email: string, pendingToken: string) {
    setPayload((prev) => ({ ...prev, email, pendingToken }));
    setState("exchanging-token");
  }

  return state === "sending-email" ? (
    <SendEmailForm payload={payload} onComplete={emailSent} />
  ) : (
    <ExchangeTokenForm
      payload={payload}
      onBack={() => setState("sending-email")}
    />
  );
}

type SendEmailProps = {
  payload: Payload;
  onComplete: (email: string, pendingToken: string) => void;
};

function SendEmailForm({ payload, onComplete }: SendEmailProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  async function submit(form: FormData) {
    startTransition(async () => {
      const result = await sendRamperEmail(form);

      switch (result.status) {
        case "error":
          setError(result.error);
          break;
        case "success":
          onComplete(result.data.email, result.data.pendingToken);
          break;
      }
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-2" id="email-submit">
      <AlertDialogDescription>
        Enter your COSMO email address to request a sign-in email.
      </AlertDialogDescription>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <input type="hidden" name="transactionId" value={payload.transactionId} />
      <Input
        type="email"
        name="email"
        placeholder="example@example.com"
        // fixes iOS zoom when focusing input
        className="touch-manipulation text-base sm:text-sm"
      />

      <Portal to="#sign-in-footer">
        <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>

        <Button type="submit" disabled={isPending} form="email-submit">
          {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
          <span>Send Email</span>
        </Button>
      </Portal>
    </form>
  );
}

type ExchangeTokenProps = {
  payload: Payload;
  onBack: () => void;
};

function ExchangeTokenForm({ payload, onBack }: ExchangeTokenProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [count, setCount] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      if (count === 0) {
        clearInterval(interval);
      } else {
        setCount((c) => c - 1);
      }
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(form: FormData) {
    startTransition(async () => {
      const result = await exchangeRamperToken(form);

      switch (result.status) {
        case "error":
          setError(result.error);
          break;
        case "success":
          track("sign-in");
          break;
      }
    });
  }

  const emailDomain = payload.email.split("@")[1];
  const enableSubmission = count < 0;
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

        <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>

        <Button
          type="submit"
          disabled={isPending || !enableSubmission}
          form="token-submit"
        >
          {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
          {enableSubmission ? "Sign In" : `Sign In (${realCount})`}
        </Button>
      </Portal>
    </form>
  );
}
