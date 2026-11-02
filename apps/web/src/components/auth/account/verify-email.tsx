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
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export function EmailStatusBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge variant="outline">
      <IconCircleCheck className="text-green-500" />
      {m.account_profile_email_verified()}
    </Badge>
  ) : (
    <Badge variant="destructive">
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
      toast.success(m.account_profile_email_verify_sent({ email }));
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });

  return (
    <div className="mt-2 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">
        {m.account_profile_email_unverified_description()}
      </span>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="self-start sm:self-auto"
            />
          }
        >
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
