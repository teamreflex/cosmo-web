import ConfirmActionDialog from "@/components/confirm-action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { formatError } from "@/lib/client/errors";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconMail,
  IconMailCheck,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
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

type SendVerificationEmailProps = {
  email: string;
  // why the user should verify, shown beside the button
  description?: string;
};

export function SendVerificationEmail({
  email,
  description = m.account_profile_email_unverified_description(),
}: SendVerificationEmailProps) {
  const mutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.sendVerificationEmail({ email });
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
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
      <p className="min-w-0 flex-1 basis-56 text-sm">{description}</p>
      <ConfirmActionDialog
        trigger={
          <Button variant="outline" size="sm">
            <IconMail />
            <span>{m.account_profile_email_verify()}</span>
          </Button>
        }
        title={m.account_profile_email_verify_title()}
        description={m.account_profile_email_verify_description({ email })}
        confirmLabel={m.account_profile_email_verify_send()}
        mutation={mutation}
      />
    </div>
  );
}
