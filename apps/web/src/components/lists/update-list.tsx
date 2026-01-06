import { useUserState } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import { currentAccountQuery, targetAccountQuery } from "@/lib/queries/core";
import type { ObjektList } from "@apollo/database/web/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconEdit, IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormState,
} from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { updateObjektListSchema } from "../../lib/universal/schema/objekt-list";
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
import { $updateObjektList } from "./actions";

type Props = {
  objektList: ObjektList;
};

export default function UpdateList({ objektList }: Props) {
  const [open, setOpen] = useState(false);
  const { cosmo } = useUserState();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: $updateObjektList,
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
