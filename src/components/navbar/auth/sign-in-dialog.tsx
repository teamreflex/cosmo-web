import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { v4 } from "uuid";
import { exchangeRamperToken, sendRamperEmail } from "./actions";
import Portal from "@/components/portal";

type SignInState = "sending-email" | "exchanging-token";
type Payload = {
  transactionId: string;
  email: string;
  pendingToken: string;
};

export default function SignInDialog() {
  const [state, setState] = useState<SignInState>("sending-email");
  const [payload, setPayload] = useState({
    transactionId: v4(),
    email: "",
    pendingToken: "",
  });

  function emailSent(email: string, pendingToken: string) {
    setPayload((prev) => ({ ...prev, email, pendingToken }));
    setState("exchanging-token");
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="link">
          <span className="hidden md:block">Sign In</span>
          <LogIn className="md:hidden h-8 w-8 shrink-0" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Sign In</AlertDialogTitle>

          <AlertDialogDescription>
            Signing in allows to you grid objekts, build wishlists and more.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {state === "sending-email" && (
          <SendEmailForm payload={payload} onComplete={emailSent} />
        )}

        {state === "exchanging-token" && (
          <ExchangeTokenForm
            payload={payload}
            onBack={() => setState("sending-email")}
          />
        )}

        <AlertDialogFooter>
          <div className="flex gap-2" id="sign-in-footer" />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
        Enter your Cosmo email address to request a sign-in email.
      </AlertDialogDescription>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <input type="hidden" name="transactionId" value={payload.transactionId} />
      <Input type="email" name="email" placeholder="example@example.com" />

      <Portal to="#sign-in-footer">
        <AlertDialogCancel>Cancel</AlertDialogCancel>

        <Button type="submit" disabled={isPending} form="email-submit">
          Send Email
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
      if (result.status === "error") {
        setError(result.error);
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
        A Cosmo login email has been sent to your{" "}
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

        <AlertDialogCancel>Cancel</AlertDialogCancel>

        <Button
          type="submit"
          disabled={isPending || !enableSubmission}
          form="token-submit"
        >
          {enableSubmission ? "Sign In" : `Sign In (${realCount})`}
        </Button>
      </Portal>
    </form>
  );
}
