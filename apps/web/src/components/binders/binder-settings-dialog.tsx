import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useArtists } from "@/hooks/use-artists";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $updateBinder } from "@/lib/functions/binders";
import { binderColourPresets } from "@/lib/universal/binders";
import type { BinderDetail } from "@/lib/universal/binders";
import { updateBinderSchema } from "@/lib/universal/schema/binder";
import type { UpdateBinder } from "@/lib/universal/schema/binder";
import type { Binder } from "@apollo/database/web/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import BinderColourInput from "./binder-colour-input";

type Props = {
  binder: BinderDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (binder: Binder) => void;
};

/**
 * Rename and recolour a binder. Colour presets come from the binder's own
 * objekts, with a custom hex after them.
 */
export default function BinderSettingsDialog({
  binder,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.binder_editor_edit()}</DialogTitle>
          <DialogDescription className="sr-only">
            {m.binder_editor_edit()}
          </DialogDescription>
        </DialogHeader>
        {/* mounted per opening, so the form starts from the saved values */}
        {open && (
          <SettingsForm
            binder={binder}
            onSaved={(row) => {
              onSaved(row);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type SettingsFormProps = {
  binder: BinderDetail;
  onSaved: (binder: Binder) => void;
};

function SettingsForm({ binder, onSaved }: SettingsFormProps) {
  const { getMember } = useArtists();
  const presets = binderColourPresets(
    binder.entries,
    (member) => getMember(member)?.primaryColorHex,
  );
  const mutation = useMutation({
    mutationFn: (data: UpdateBinder) => $updateBinder({ data }),
    onSuccess: onSaved,
    onError: (error) => toast.error(formatError(error)),
  });
  const form = useForm({
    resolver: standardSchemaResolver(updateBinderSchema),
    defaultValues: {
      binderId: binder.id,
      name: binder.name,
      colour: binder.colour,
    },
  });

  return (
    <form
      // mutate rather than mutateAsync, since a rejection would escape handleSubmit unhandled
      onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
      className="flex flex-col gap-4"
    >
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="binder-name">{m.list_name()}</FieldLabel>
            <Input
              id="binder-name"
              data-1p-ignore
              maxLength={24}
              aria-invalid={fieldState.invalid}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="colour"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="binder-colour">
              {m.binder_editor_colour()}
            </FieldLabel>
            <BinderColourInput
              id="binder-colour"
              aria-invalid={fieldState.invalid}
              presets={presets}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Button type="submit" disabled={mutation.isPending}>
        {m.common_save()}
        {mutation.isPending && (
          <IconLoader2 className="animate-spin" />
        )}
      </Button>
    </form>
  );
}
