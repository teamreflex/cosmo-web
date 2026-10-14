import ChatPanel from "@/components/trades/chat/chat-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasPermission } from "@/hooks/use-has-permission";
import { m } from "@/i18n/messages";
import { ChatClient, reportedMessageAtom } from "@/lib/client/chat";
import { adminReportsQueryFilter } from "@/lib/queries/reports";
import type {
  AdminReportDetail,
  ReportTargetMessage,
} from "@/lib/universal/reports";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Exit, Redacted } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTransition } from "react";
import { toast } from "sonner";

type Props = {
  report: AdminReportDetail;
  message: ReportTargetMessage;
};

/**
 * The parts of a message report that come from chat: the report's own copy
 * of the message, which outlives removal and retention, Remove message, and
 * the trade's chat, read-only. Loaded only with a message report.
 */
export default function MessageReport({ report, message }: Props) {
  const result = useAtomValue(reportedMessageAtom(report.id));
  const open = report.status === "open" || report.status === "escalated";

  return (
    <>
      {AsyncResult.isSuccess(result) ? (
        <blockquote
          dir="auto"
          className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm wrap-anywhere whitespace-pre-wrap"
        >
          {Redacted.value(result.value.body)}
        </blockquote>
      ) : AsyncResult.isFailure(result) ? (
        <p className="text-sm text-muted-foreground">
          {m.admin_reports_message_unavailable()}
        </p>
      ) : (
        <Skeleton className="h-12 rounded-md" />
      )}
      {message.removed ? (
        <p className="text-xs text-muted-foreground">
          {m.admin_reports_message_removed()}
        </p>
      ) : (
        open && <RemoveMessage messageId={message.id} />
      )}
      {message.trade !== null && (
        <ChatPanel trade={message.trade} side={null} className="h-96" />
      )}
    </>
  );
}

/**
 * Blanks the message in the chat and posts a staff event there. The report
 * stays open until staff resolve it.
 */
function RemoveMessage({ messageId }: { messageId: number }) {
  const hasPermission = useHasPermission();
  const queryClient = useQueryClient();
  const remove = useAtomSet(ChatClient.mutation("Remove"), {
    mode: "promiseExit",
  });
  const [pending, startTransition] = useTransition();

  if (!hasPermission({ trade: ["remove-message"] })) return null;

  function handleRemove() {
    startTransition(async () => {
      const exit = await remove({ payload: { messageId } });
      if (Exit.isSuccess(exit)) {
        toast.success(m.admin_reports_message_removed_toast());
        await queryClient.invalidateQueries(adminReportsQueryFilter);
      } else {
        toast.error(m.chat_unavailable());
      }
    });
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      className="w-fit max-md:h-10"
      disabled={pending}
      onClick={handleRemove}
    >
      <span>{m.admin_reports_remove_message()}</span>
      {pending && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
