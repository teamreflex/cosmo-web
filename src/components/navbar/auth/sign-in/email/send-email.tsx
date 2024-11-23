import { useState, useTransition } from "react";
import { EmailSignInPayload } from "./common";
import { sendRamperEmail } from "./actions";
import {
  AlertDialogCancel,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import Portal from "@/components/portal";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Props = {
  payload: EmailSignInPayload;
  onComplete: (email: string, pendingToken: string) => void;
};

export default function SendEmailForm({ payload, onComplete }: Props) {
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
      <Input type="email" name="email" placeholder="example@example.com" />

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
