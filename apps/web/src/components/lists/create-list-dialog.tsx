import { m } from "@/i18n/messages";
import { $createObjektList } from "@/lib/functions/lists";
import { currentAccountQuery, targetAccountQuery } from "@/lib/queries/core";
import { track } from "@/lib/utils";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
  Controller,
  FormProvider,
  useForm,
  useFormState,
} from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import {
  createObjektListSchema,
  defaultCurrencies,
} from "../../lib/universal/schema/objekt-list";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";

type Props = {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  username?: string;
};

export default function CreateListDialog(props: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: $createObjektList,
    onSuccess: (result) => {
      track("create-list");
      toast.success(m.toast_list_created());
      // insert new list into current account query
      queryClient.setQueryData(currentAccountQuery.queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          objektLists: [...old.objektLists, result],
        };
      });

      // insert new list into target account query if it exists
      if (props.username) {
        queryClient.setQueryData(
          targetAccountQuery(props.username).queryKey,
          (old) => {
            if (!old) return old;
            return {
              ...old,
              objektLists: [...old.objektLists, result],
            };
          },
        );
      }

      // refresh the loader
      void router.invalidate({
        filter: (route) =>
          route.routeId === "/" ||
          (props.username !== undefined &&
            route.pathname === `/@${props.username}`),
      });

      props.onOpenChange(false);
    },
  });

  const form = useForm<z.infer<typeof createObjektListSchema>>({
    resolver: standardSchemaResolver(createObjektListSchema),
    defaultValues: {
      name: "",
      currency: undefined,
    },
  });

  async function handleSubmit(data: z.infer<typeof createObjektListSchema>) {
    await mutation.mutateAsync({ data });
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{m.list_create()}</DialogTitle>
          <DialogDescription>{m.list_create_description()}</DialogDescription>
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
      <span>{m.common_create()}</span>
      {isSubmitting && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
