import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";

/**
 * A rating's comment, which may be one long unbroken string or right-to-left
 * text, struck through once a moderator removed it. A rating left without a
 * comment reads "No comment".
 */
export function FeedbackComment({
  text,
  removed = false,
  className,
}: {
  text: string | null;
  removed?: boolean;
  className?: string;
}) {
  if (text === null) {
    return (
      <p className={cn("text-muted-foreground", className)}>
        {m.feedback_no_comment()}
      </p>
    );
  }
  return (
    <p
      className={cn(
        "wrap-anywhere",
        removed && "text-muted-foreground line-through",
        className,
      )}
    >
      <bdi dir="auto">{text}</bdi>
    </p>
  );
}
