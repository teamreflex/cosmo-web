import { useUserState } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import { $updateObjektList } from "@/lib/functions/lists";
import { currentAccountQuery, targetAccountQuery } from "@/lib/queries/core";
import type { ObjektList } from "@apollo/database/web/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconEdit, IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormState,
} from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import {
  defaultCurrencies,
  updateObjektListSchema,
} from "../../lib/universal/schema/objekt-list";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";

type Props = {
  objektList: ObjektList;
};

export default function UpdateList({ objektList }: Props) {
  const [open, setOpen] = useState(false);
  const { cosmo } = useUserState();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: useServerFn($updateObjektList),
    onSuccess: async () => {
      toast.success(m.toast_list_updated());
      // invalidate current account query to update list name in user's lists
      await queryClient.invalidateQueries({
        queryKey: currentAccountQuery.queryKey,
      });
      // invalidate target account queries to update list name on profile pages
      if (cosmo) {
        await queryClient.invalidateQueries({
          queryKey: targetAccountQuery(cosmo.username).queryKey,
        });
      }
      setOpen(false);
    },
  });

  const form = useForm<z.infer<typeof updateObjektListSchema>>({
    resolver: standardSchemaResolver(updateObjektListSchema),
    defaultValues: {
      id: objektList.id,
      name: objektList.name,
      currency: objektList.currency ?? undefined,
    },
  });

  async function handleSubmit(data: z.infer<typeof updateObjektListSchema>) {
    await mutation.mutateAsync({
      data,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full"
          aria-label={m.aria_edit_list()}
        >
          <IconEdit />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{m.list_update()}</DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex w-full flex-col gap-2"
          >
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="name">{m.list_name()}</FieldLabel>
                  <Input
                    id="name"
                    placeholder={m.list_name_placeholder()}
                    data-1p-ignore
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <CurrencyField />

            <SubmitButton />
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function CurrencyField() {
  return (
    <Controller
      name="currency"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{m.list_currency()}</FieldLabel>
          <Input
            placeholder="USD"
            maxLength={3}
            value={field.value ?? ""}
            onChange={(e) =>
              field.onChange(e.target.value === "" ? undefined : e.target.value)
            }
          />
          <div className="flex gap-1">
            {defaultCurrencies.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() =>
                  field.onChange(field.value === c ? undefined : c)
                }
                className="rounded-md border px-2 py-0.5 text-xs data-[active=true]:bg-accent"
                data-active={field.value?.toUpperCase() === c}
                aria-pressed={field.value?.toUpperCase() === c}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {m.list_currency_description()}
          </p>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

function SubmitButton() {
  const { isSubmitting } = useFormState();

  return (
    <Button type="submit" disabled={isSubmitting}>
      <span>{m.common_save()}</span>
      {isSubmitting && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
