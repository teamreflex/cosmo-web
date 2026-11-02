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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { formatError } from "@/lib/client/errors";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconLoader2,
  IconMail,
  IconMailCheck,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export function EmailStatusBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge variant="success">
      <IconCircleCheck />
      {m.account_profile_email_verified()}
    </Badge>
  ) : (
    <Badge variant="warning">
      <IconAlertCircle />
      {m.account_profile_email_unverified()}
    </Badge>
  );
}

export function SendVerificationEmail({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.sendVerificationEmail({ email });
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
    onSuccess: () => {
      setOpen(false);
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });

  if (mutation.isSuccess) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-muted px-3.5 py-3"
      >
        <IconMailCheck className="size-4.5 shrink-0 text-green-700 dark:text-green-400" />
        <p className="min-w-0 flex-1 basis-56 text-sm">
          {m.account_profile_email_verify_sent({ email })}
        </p>
        <Button variant="ghost" size="sm" onClick={() => mutation.reset()}>
          {m.account_profile_email_verify_resend()}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-600/25 bg-amber-500/5 px-3.5 py-3 dark:border-amber-400/25 dark:bg-amber-400/5">
      <IconAlertCircle className="size-4.5 shrink-0 text-amber-700 dark:text-amber-400" />
      <p className="min-w-0 flex-1 basis-56 text-sm">
        {m.account_profile_email_unverified_description()}
      </p>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
          <IconMail />
          <span>{m.account_profile_email_verify()}</span>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {m.account_profile_email_verify_title()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.account_profile_email_verify_description({ email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={(event) => {
                event.preventBaseUIHandler();
                mutation.mutate();
              }}
              disabled={mutation.isPending}
            >
              <span>{m.account_profile_email_verify_send()}</span>
              {mutation.isPending && <IconLoader2 className="animate-spin" />}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
