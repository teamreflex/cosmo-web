import { m } from "@/i18n/messages";
import { $addObjektToSaleList } from "@/lib/functions/lists";
import { objektListQueryFilter } from "@/lib/queries/objekt-queries";
import { addObjektToSaleListSchema } from "@/lib/universal/schema/objekt-list";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Controller,
  FormProvider,
  useForm,
  useFormState,
} from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objektListId: string;
  listName: string;
  slug: string;
  collectionName: string;
  currency: string;
};

export default function SaleListDialog({
  open,
  onOpenChange,
  objektListId,
  listName,
  slug,
  collectionName,
  currency,
}: Props) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: $addObjektToSaleList,
    onSuccess: async () => {
      toast.success(
        m.toast_added_to_list({ collectionId: collectionName, listName }),
      );
      await queryClient.invalidateQueries(objektListQueryFilter(objektListId));
      onOpenChange(false);
    },
  });

  const form = useForm<z.infer<typeof addObjektToSaleListSchema>>({
    resolver: standardSchemaResolver(addObjektToSaleListSchema),
    defaultValues: {
      objektListId,
      slug,
      quantity: 1,
      price: undefined,
    },
  });

  async function handleSubmit(data: z.infer<typeof addObjektToSaleListSchema>) {
    await mutation.mutateAsync({ data });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {m.list_add_to_sale_list()} — {collectionName}
          </DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex w-full flex-col gap-2"
          >
            <Controller
              control={form.control}
              name="quantity"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{m.list_sale_quantity()}</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="price"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>
                    {m.list_sale_price()} ({currency})
                  </FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ""
                          ? undefined
                          : e.target.valueAsNumber,
                      )
                    }
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
      <span>{m.list_add_to_list()}</span>
      {isSubmitting && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
