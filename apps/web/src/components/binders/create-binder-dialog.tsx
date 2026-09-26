import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $createBinder } from "@/lib/functions/binders";
import {
  binderMenuKey,
  binderQuery,
  binderShelfQuery,
} from "@/lib/queries/binders";
import {
  type BinderDetail,
  type BinderLayout,
  DEFAULT_BINDER_COLOUR,
  binderGrid,
  binderLayoutLabel,
  binderLayouts,
  fullHexColour,
} from "@/lib/universal/binders";
import {
  type CreateBinder,
  createBinderSchema,
} from "@/lib/universal/schema/binder";
import { track } from "@/lib/utils";
import type { Binder } from "@apollo/database/web/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type Control, Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import BinderColourInput from "./binder-colour-input";
import BinderCover from "./binder-cover";

type Props = {
  /** the route param the profile was opened with, for the editor link */
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** replaces the toast and the editor landing, such as to add an objekt to it */
  onCreated?: (binder: Binder) => void;
};

/**
 * Name a new binder and pick its layout and spine colour, then land in its
 * editor, since an empty binder's next step is filling it.
 */
export default function CreateBinderDialog({
  username,
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  function handleCreated(binder: Binder) {
    track("create-binder");

    // seeded so the editor opens without fetching a binder known to be empty
    queryClient.setQueryData(
      binderQuery(binder.userId, binder.slug).queryKey,
      (): BinderDetail => ({ ...binder, entries: [] }),
    );
    void queryClient.invalidateQueries({
      queryKey: binderShelfQuery(binder.userId).queryKey,
    });
    void queryClient.resetQueries({ queryKey: binderMenuKey });

    onOpenChange(false);
    if (onCreated !== undefined) {
      onCreated(binder);
      return;
    }

    toast.success(m.binder_created());
    void navigate({
      to: "/@{$username}/binder/$slug",
      params: { username, slug: binder.slug },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.binder_new()}</DialogTitle>
          <DialogDescription>{m.binder_create_description()}</DialogDescription>
        </DialogHeader>
        {/* mounted per opening, so the form starts empty */}
        {open && <CreateBinderForm onCreated={handleCreated} />}
      </DialogContent>
    </Dialog>
  );
}

function CreateBinderForm({
  onCreated,
}: {
  onCreated: (binder: Binder) => void;
}) {
  const mutation = useMutation({
    mutationFn: (data: CreateBinder) => $createBinder({ data }),
    onSuccess: onCreated,
    onError: (error) => toast.error(formatError(error)),
  });
  const form = useForm({
    resolver: standardSchemaResolver(createBinderSchema),
    defaultValues: {
      name: "",
      layout: "3x3",
      colour: DEFAULT_BINDER_COLOUR,
    } satisfies CreateBinder,
  });

  return (
    <form
      // mutate rather than mutateAsync, since a rejection would escape handleSubmit unhandled
      onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
      className="grid gap-5 sm:grid-cols-[7.5rem_minmax(0,1fr)]"
    >
      <CoverPreview control={form.control} />

      <div className="flex min-w-0 flex-col gap-4">
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="binder-name">{m.list_name()}</FieldLabel>
              <Input
                id="binder-name"
                placeholder={m.binder_create_name_placeholder()}
                data-1p-ignore
                autoFocus
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
          name="layout"
          render={({ field }) => (
            <FieldSet className="gap-2">
              <FieldLegend variant="label" className="mb-1">
                {m.binder_editor_layout()}
              </FieldLegend>
              <div className="grid grid-cols-3 gap-2">
                {binderLayouts.map((layout) => (
                  <LayoutOption
                    key={layout}
                    layout={layout}
                    name={field.name}
                    checked={field.value === layout}
                    onSelect={() => field.onChange(layout)}
                  />
                ))}
              </div>
              <FieldDescription>
                {m.binder_create_layout_locked()}
              </FieldDescription>
            </FieldSet>
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
                {...field}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Button type="submit" disabled={mutation.isPending}>
          {m.common_create()}
          {mutation.isPending && <IconLoader2 className="animate-spin" />}
        </Button>
      </div>
    </form>
  );
}

/**
 * The new binder as it will sit on the shelf, following the form as it's
 * filled in. Hidden on a phone, where the dialog has no room beside the form.
 */
function CoverPreview({ control }: { control: Control<CreateBinder> }) {
  const [name, colour] = useWatch({
    control,
    name: ["name", "colour"],
  });

  return (
    <BinderCover
      binder={{
        name: name.trim() === "" ? m.binder_create_name_placeholder() : name,
        colour: fullHexColour(colour) ?? DEFAULT_BINDER_COLOUR,
        artwork: { kind: "collage", images: [] },
      }}
      className="hidden sm:block"
    />
  );
}

type LayoutOptionProps = {
  layout: BinderLayout;
  name: string;
  checked: boolean;
  onSelect: () => void;
};

/**
 * A radio drawn as a tiny page of pockets, so the choice reads at a glance.
 */
function LayoutOption({ layout, name, checked, onSelect }: LayoutOptionProps) {
  const { columns, rows, pocketsPerPage } = binderGrid(layout);

  return (
    <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-md border border-border px-2 py-2.5 text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground has-checked:border-cosmo has-checked:bg-cosmo/10 has-checked:text-foreground has-focus-visible:ring-2 has-focus-visible:ring-cosmo-text">
      <input
        type="radio"
        name={name}
        value={layout}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden
        style={{ gridTemplateColumns: `repeat(${columns}, 0.375rem)` }}
        className="grid h-9 content-center gap-0.5"
      >
        {Array.from({ length: columns * rows }, (_, i) => (
          <span key={i} className="aspect-photocard rounded-[1px] bg-current" />
        ))}
      </span>
      <span className="text-sm font-semibold text-foreground">
        {binderLayoutLabel(layout)}
      </span>
      <span className="text-xs">
        {m.binder_create_layout_pockets({ count: pocketsPerPage })}
      </span>
    </label>
  );
}
