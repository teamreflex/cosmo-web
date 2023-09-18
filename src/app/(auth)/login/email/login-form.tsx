"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { experimental_useFormStatus as useFormStatus } from "react-dom";
import { exchangeCode, sendRamperEmail } from "./actions";
import { useState } from "react";
import { v4 } from "uuid";

export function LoginForm() {
  const [transactionId, _] = useState(v4());
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [token, setToken] = useState<string>("");

  function onEmailSent({ email, token }: { email: string; token: string }) {
    setEmailSent(true);
    setToken(token);
    setEmail(email);
  }

  return (
    <>
      {emailSent ? (
        <TokenExchangeForm
          email={email}
          token={token}
          transactionId={transactionId}
        />
      ) : (
        <EmailSubmission
          transactionId={transactionId}
          onEmailSent={onEmailSent}
        />
      )}
    </>
  );
}

/**
 * email submission form
 */

type EmailSubmissionProps = {
  transactionId: string;
  onEmailSent: ({ token, email }: { token: string; email: string }) => void;
};

function EmailSubmission({ transactionId, onEmailSent }: EmailSubmissionProps) {
  const [error, setError] = useState<string | null>(null);

  async function onLogin(formData: FormData) {
    const result = await sendRamperEmail(formData);

    if (!result.success && result.error) {
      setError(result.error);
    } else {
      onEmailSent({ email: result.email!, token: result.token! });
    }
  }

  return (
    <form action={onLogin} className="w-full flex flex-col gap-2">
      <input type="hidden" name="transactionId" value={transactionId} />

      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input type="email" id="email" name="email" placeholder="Email" />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <EmailSubmissionButton />
    </form>
  );
}

function EmailSubmissionButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="cosmo"
      disabled={pending}
      className="flex gap-2"
    >
      {pending && <Loader2 className="animate-spin" />}
      Next
    </Button>
  );
}

/**
 * token exchange form
 */

type TokenExchangeProps = {
  email: string;
  token: string;
  transactionId: string;
};

function TokenExchangeForm({
  email,
  token,
  transactionId,
}: TokenExchangeProps) {
  return (
    <form action={exchangeCode} className="w-full flex flex-col gap-2">
      <input type="hidden" name="transactionId" value={transactionId} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />

      <TokenExchangeButton />
    </form>
  );
}

function TokenExchangeButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="cosmo"
      disabled={pending}
      className="flex gap-2"
    >
      {pending && <Loader2 className="animate-spin" />}
      Login
    </Button>
  );
}
