import { m } from "@/i18n/messages";
import { useId } from "react";
import type {
  ControllerFieldState,
  ControllerRenderProps,
} from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import { Textarea } from "../ui/textarea";

type Props = {
  field: Omit<ControllerRenderProps, "value"> & { value?: string | null };
  fieldState: ControllerFieldState;
  /** whether the action can go ahead without a note */
  optional: boolean;
};

/**
 * The note staff leave with an action on a trade, which both parties read
 * on its timeline.
 */
export default function StaffNoteField({ field, fieldState, optional }: Props) {
  const noteId = useId();
  const descriptionId = useId();

  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={noteId}>
        {m.admin_dispute_note()}
        {optional && (
          <span className="text-xs font-normal text-muted-foreground">
            {m.report_note_optional()}
          </span>
        )}
      </FieldLabel>
      <Textarea
        id={noteId}
        rows={3}
        maxLength={1000}
        className="max-h-40 resize-none"
        aria-invalid={fieldState.invalid}
        aria-describedby={descriptionId}
        {...field}
        value={field.value ?? ""}
      />
      <FieldDescription id={descriptionId}>
        {m.admin_dispute_note_description()}
      </FieldDescription>
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}
