import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Controller, FormProvider, useForm, useFormState } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { createObjektListSchema } from "../../lib/universal/schema/objekt-list";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { $createObjektList } from "./actions";
import type { z } from "zod";
import { track } from "@/lib/utils";
import { currentAccountQuery, targetAccountQuery } from "@/lib/queries/core";
import { m } from "@/i18n/messages";

type Props = {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  username?: string;
};

export default function CreateListDialog(props: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutationFn = useServerFn($createObjektList);
  const mutation = useMutation({
    mutationFn,
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
      router.invalidate({
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

            <SubmitButton />
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
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
