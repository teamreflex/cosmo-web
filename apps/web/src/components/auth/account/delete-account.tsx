import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { env } from "@/lib/env/client";
import {
  $deleteAccount,
  $requestAccountDeletion,
} from "@/lib/functions/account";
import { accountDeletionQuery } from "@/lib/queries/account";
import { currentAccountQuery, removeViewerQueries } from "@/lib/queries/core";
import {
  type DeletionBlocker,
  FRESH_SESSION_MINUTES,
  deletionBlockerCount,
} from "@/lib/universal/account-deletion";
import type { AccountErrorCode } from "@/lib/universal/errors/accounts";
import { isExpectedError } from "@/lib/universal/errors/expected";
import { IconLoader2, IconMailCheck, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import DeletionBlockerRows from "./deletion-blockers";

export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" className="self-start max-sm:h-10" />
        }
      >
        <IconTrash className="size-4" />
        <span>{m.delete_account_title()}</span>
      </DialogTrigger>
      {/* the content loads after opening, so the dialog takes focus rather than its close button */}
      <DialogContent ref={popupRef} initialFocus={popupRef}>
        <DeleteAccountContent />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Mounted only while the dialog is open, so every open checks again and
 * starts from the confirmation.
 */
function DeleteAccountContent() {
  const check = useQuery(accountDeletionQuery);

  switch (check.status) {
    case "pending":
      return <Pending />;
    case "error":
      return <CheckFailed error={check.error} />;
    case "success":
      if (check.data.status === "blocked") {
        return <Blocked blockers={check.data.blockers} />;
      }
      switch (check.data.step) {
        case "send-email":
          return <SendEmail />;
        case "delete":
          return <DeleteNow />;
        case "sign-in-again":
          return <SignInAgain />;
      }
  }
}

function SendEmail() {
  const request = useMutation({
    mutationFn: () => $requestAccountDeletion(),
    onError: (error) => {
      toast.error(formatError(error));
    },
  });

  switch (request.data?.status) {
    case "sent":
      return <Sent />;
    case "blocked":
      return <Blocked blockers={request.data.blockers} />;
    default:
      return (
        <Confirm
          action={m.delete_account_send_email()}
          pending={request.isPending}
          onConfirm={() => request.mutate()}
        />
      );
  }
}

/**
 * An account without a deliverable email deletes from here, on a session
 * signed in within the last few minutes.
 */
function DeleteNow() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const deletion = useMutation({
    mutationFn: () => $deleteAccount({ data: { kind: "fresh-session" } }),
    onSuccess: async (result) => {
      if (result.status === "blocked") {
        return;
      }

      toast.success(m.delete_account_done_title(), {
        description: m.delete_account_done_description(),
      });
      queryClient.setQueryData(currentAccountQuery.queryKey, null);
      await router.navigate({ to: "/" });
      // after navigating, so no mounted staff page refetches what's removed
      removeViewerQueries(queryClient);
      await router.invalidate();
    },
    onError: (error) => {
      if (!isSessionStale(error)) {
        toast.error(formatError(error));
      }
    },
  });

  if (deletion.data?.status === "blocked") {
    return <Blocked blockers={deletion.data.blockers} />;
  }
  if (isSessionStale(deletion.error)) {
    return <SignInAgain />;
  }
  return (
    <Confirm
      action={m.delete_account_finish_submit()}
      note={m.delete_account_finish_description()}
      pending={deletion.isPending}
      onConfirm={() => deletion.mutate()}
    />
  );
}

function isSessionStale(error: Error | null) {
  return (
    error?.message ===
    ("account_deletion_session_stale" satisfies AccountErrorCode)
  );
}

function SignInAgain() {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{m.delete_account_sign_in_again_title()}</DialogTitle>
        <DialogDescription>
          {m.delete_account_sign_in_again_description({
            minutes: FRESH_SESSION_MINUTES,
          })}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <CloseButton />
      </DialogFooter>
    </>
  );
}

function Pending() {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="sr-only">
          {m.delete_account_title()}
        </DialogTitle>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </DialogHeader>
      <DialogFooter>
        <Skeleton className="h-9 w-full max-sm:h-11 sm:w-48" />
      </DialogFooter>
    </>
  );
}

function CheckFailed({ error }: { error: Error }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{m.delete_account_title()}</DialogTitle>
      </DialogHeader>
      {/* a genuine failure's message is for Sentry, not the viewer */}
      <p className="text-sm text-destructive">
        {isExpectedError(error)
          ? formatError(error)
          : m.delete_account_check_failed()}
      </p>
      <DialogFooter>
        <CloseButton />
      </DialogFooter>
    </>
  );
}

function Blocked({ blockers }: { blockers: readonly DeletionBlocker[] }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{m.delete_account_blocked_title()}</DialogTitle>
        <DialogDescription>
          {m.delete_account_blocked_description({
            count: deletionBlockerCount(blockers),
          })}
        </DialogDescription>
      </DialogHeader>
      <DeletionBlockerRows blockers={blockers} />
      <DialogFooter>
        <CloseButton />
      </DialogFooter>
    </>
  );
}

type ConfirmProps = {
  action: string;
  note?: string;
  pending: boolean;
  onConfirm: () => void;
};

function Confirm({ action, note, pending, onConfirm }: ConfirmProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{m.delete_account_confirm_title()}</DialogTitle>
        <DialogDescription>
          {m.delete_account_confirm_description()}
        </DialogDescription>
        <p className="text-sm text-muted-foreground">
          {m.delete_account_confirm_cosmo({ appName: env.VITE_APP_NAME })}
        </p>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </DialogHeader>
      <DialogFooter>
        <DialogClose
          render={<Button variant="secondary" className="max-sm:h-11" />}
        >
          {m.common_cancel()}
        </DialogClose>
        <Button
          variant="destructive"
          className="max-sm:h-11"
          disabled={pending}
          onClick={onConfirm}
        >
          <span>{action}</span>
          {pending && <IconLoader2 className="animate-spin" />}
        </Button>
      </DialogFooter>
    </>
  );
}

function Sent() {
  return (
    <div className="flex flex-col items-center justify-center gap-1 text-center">
      <IconMailCheck className="mb-1 size-10" />
      <DialogTitle className="text-sm leading-snug">
        {m.delete_account_success_title()}
      </DialogTitle>
      <DialogDescription>
        {m.delete_account_success_description()}
      </DialogDescription>

      <DialogFooter className="mt-4 w-full sm:w-auto">
        <CloseButton />
      </DialogFooter>
    </div>
  );
}

function CloseButton() {
  return (
    <DialogClose render={<Button variant="outline" className="max-sm:h-11" />}>
      {m.common_close()}
    </DialogClose>
  );
}
