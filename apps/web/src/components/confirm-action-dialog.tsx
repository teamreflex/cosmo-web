import { m } from "@/i18n/messages";
import type { UseMutateFunction } from "@tanstack/react-query";
import { useRef } from "react";
import type { ComponentProps, ReactElement, ReactNode } from "react";
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
} from "./ui/alert-dialog";
import { Spinner } from "./ui/spinner";

type Props = {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ComponentProps<typeof AlertDialogAction>["variant"];
  size?: ComponentProps<typeof AlertDialogContent>["size"];
  // applied to both buttons
  buttonClassName?: string;
  // the action, which takes no variables: the dialog starts it and waits on it
  mutation: { isPending: boolean; mutate: UseMutateFunction };
} & (
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      trigger?: undefined;
    }
  | {
      // the button that opens the dialog, which then keeps its own open state
      trigger: ReactElement;
      open?: undefined;
      onOpenChange?: undefined;
    }
);

/**
 * Asks before an action that can't be called back. Once confirmed, the dialog
 * can't be closed and both buttons are disabled while the mutation runs. A
 * caller that holds `open` closes it in the mutation's `onSuccess`; a
 * `trigger` suits an action whose success unmounts the trigger.
 */
export default function ConfirmActionDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = m.common_cancel(),
  variant,
  size,
  buttonClassName,
  mutation,
  open,
  onOpenChange,
  trigger,
}: Props) {
  // a second click before the first re-renders the button disabled sends nothing
  const submitting = useRef(false);

  return (
    <AlertDialog
      open={open}
      // the action can't be called back, so the dialog waits for its answer
      onOpenChange={(next, details) => {
        if (mutation.isPending) details.cancel();
        else onOpenChange?.(next);
      }}
    >
      {trigger && <AlertDialogTrigger render={trigger} />}
      <AlertDialogContent size={size}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description !== undefined && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className={buttonClassName}
            disabled={mutation.isPending}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant={variant}
            className={buttonClassName}
            // the action is a Close part, and the dialog stays open while the mutation runs
            onClick={(event) => {
              event.preventBaseUIHandler();
              if (submitting.current) return;
              submitting.current = true;
              mutation.mutate(undefined, {
                onSettled: () => {
                  submitting.current = false;
                },
              });
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
