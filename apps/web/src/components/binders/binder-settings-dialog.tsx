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
import { cn } from "@/lib/utils";
import type { Binder } from "@apollo/database/web/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

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
      onSubmit={form.handleSubmit(async (data) => {
        await mutation.mutateAsync(data);
      })}
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
            {presets.length > 0 && (
              <div
                role="group"
                aria-label={m.binder_editor_colour_presets()}
                className="flex flex-wrap gap-2"
              >
                {presets.map((colour) => (
                  <Swatch
                    key={colour}
                    colour={colour}
                    selected={field.value?.toLowerCase() === colour}
                    onSelect={() => field.onChange(colour)}
                  />
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={m.binder_editor_colour_custom()}
                value={
                  /^#[0-9a-f]{6}$/i.test(field.value ?? "")
                    ? field.value
                    : "#000000"
                }
                onChange={(event) => field.onChange(event.target.value)}
                className="size-9 shrink-0 cursor-pointer rounded-sm border border-border bg-transparent p-0.5"
              />
              <Input
                id="binder-colour"
                aria-label={m.binder_editor_colour_hex()}
                aria-invalid={fieldState.invalid}
                maxLength={7}
                spellCheck={false}
                className="font-mono"
                {...field}
              />
            </div>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {m.common_save()}
        {form.formState.isSubmitting && (
          <IconLoader2 className="animate-spin" />
        )}
      </Button>
    </form>
  );
}

type SwatchProps = {
  colour: string;
  selected: boolean;
  onSelect: () => void;
};

function Swatch({ colour, selected, onSelect }: SwatchProps) {
  return (
    <button
      type="button"
      aria-label={colour}
      aria-pressed={selected}
      title={colour}
      onClick={onSelect}
      style={{ backgroundColor: colour }}
      className={cn(
        "grid size-8 place-items-center rounded-full ring-1 ring-white/15 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cosmo-text",
        selected &&
          "ring-2 ring-foreground ring-offset-2 ring-offset-background",
      )}
    >
      {selected && <IconCheck className="size-4 text-white drop-shadow" />}
    </button>
  );
}
