import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $removeFeedback } from "@/lib/functions/feedback";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import ConfirmActionDialog from "../confirm-action-dialog";

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
    <ConfirmActionDialog
      open={open}
      onOpenChange={onClose}
      title={m.feedback_remove_rating_title()}
      description={
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
      }
      confirmLabel={m.admin_reports_remove_rating()}
      variant="destructive"
      buttonClassName="max-sm:h-11"
      mutation={mutation}
    />
  );
}
