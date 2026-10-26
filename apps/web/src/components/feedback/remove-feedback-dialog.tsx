import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $removeFeedback } from "@/lib/functions/feedback";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Spinner } from "../ui/spinner";

/**
 * Confirms removing a rating as a moderator, which can't be undone. It stays
 * open until the removal lands. Removing from a report also resolves it.
 */
export default function RemoveFeedbackDialog({
  feedbackId,
  reportId,
  open,
  ratedName,
  onClose,
  onSettled,
}: {
  feedbackId: string;
  reportId?: string;
  open: boolean;
  /** who was rated */
  ratedName: string;
  onClose: () => void;
  onSettled: () => void;
}) {
  const mutation = useMutation({
    mutationFn: () => $removeFeedback({ data: { feedbackId, reportId } }),
    onSuccess: () => {
      toast.success(m.admin_reports_feedback_rating_removed_toast());
      onClose();
    },
    onError: (error) => toast.error(formatError(error)),
    onSettled,
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !mutation.isPending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.feedback_remove_rating_title()}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <ParaglideMessage
              message={m.feedback_remove_rating_body}
              inputs={{ name: ratedName }}
              markup={{
                // a handle such as @qa11-v2 would otherwise break at its hyphen
                who: ({ children }) => (
                  <bdi className="whitespace-nowrap">{children}</bdi>
                ),
              }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="max-sm:h-11"
            disabled={mutation.isPending}
          >
            {m.common_cancel()}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            className="max-sm:h-11"
            onClick={(event) => {
              event.preventBaseUIHandler();
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner />}
            {m.admin_reports_remove_rating()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
