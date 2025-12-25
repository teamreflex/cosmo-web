import { IconEdit, IconLoader2 } from "@tabler/icons-react";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Controller, FormProvider, useForm, useFormState } from "react-hook-form";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { updateObjektListSchema } from "../../lib/universal/schema/objekt-list";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { $updateObjektList } from "./actions";
import type { z } from "zod";
import type { ObjektList } from "@apollo/database/web/types";
import { useUserState } from "@/hooks/use-user-state";
import { currentAccountQuery, targetAccountQuery } from "@/lib/queries/core";
import { m } from "@/i18n/messages";

type Props = {
  objektList: ObjektList;
};

export default function UpdateList({ objektList }: Props) {
  const [open, setOpen] = useState(false);
  const { cosmo } = useUserState();
  const queryClient = useQueryClient();
  const mutationFn = useServerFn($updateObjektList);
  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success(m.toast_list_updated());
      // invalidate current account query to update list name in user's lists
      queryClient.invalidateQueries({
        queryKey: currentAccountQuery.queryKey,
      });
      // invalidate target account queries to update list name on profile pages
      if (cosmo) {
        queryClient.invalidateQueries({
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
        <Button variant="secondary" size="icon" className="rounded-full">
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
      <span>{m.common_save()}</span>
      {isSubmitting && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
