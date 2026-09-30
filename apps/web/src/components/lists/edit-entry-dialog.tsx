import { m } from "@/i18n/messages";
import { $updateObjektListEntry } from "@/lib/functions/lists";
import { collectionListingsQuery } from "@/lib/queries/listings";
import { objektListQueryFilter } from "@/lib/queries/objekt-queries";
import { updateObjektListEntrySchema } from "@/lib/universal/schema/objekt-list";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
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
import PriceCheck from "./price-check";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objektListId: string;
  objektListEntryId: string;
  tokenId: string | null;
  quantity: number;
  price: number | null;
  currency: string;
  rateToUsd: number | null;
  slug: string;
  collectionId: string;
  onViewListings?: () => void;
};

type FormValues = z.infer<typeof updateObjektListEntrySchema>;

export default function EditEntryDialog({
  open,
  onOpenChange,
  objektListId,
  objektListEntryId,
  tokenId,
  quantity,
  price,
  currency,
  rateToUsd,
  slug,
  collectionId,
  onViewListings,
}: Props) {
  const isTokenKeyed = tokenId !== null;
  const positionId = useId();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: $updateObjektListEntry,
    onSuccess: async () => {
      toast.success(m.toast_entry_updated());
      await Promise.all([
        queryClient.invalidateQueries(objektListQueryFilter(objektListId)),
        queryClient.invalidateQueries({
          queryKey: collectionListingsQuery(slug).queryKey,
        }),
      ]);
      onOpenChange(false);
    },
  });

  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(updateObjektListEntrySchema),
    values: isTokenKeyed
      ? {
          kind: "token",
          objektListId,
          objektListEntryId,
          price: price,
        }
      : {
          kind: "collection",
          objektListId,
          objektListEntryId,
          quantity,
          price: price,
        },
  });

  async function handleSubmit(data: FormValues) {
    await mutation.mutateAsync({ data });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      // the dialog stays mounted, so drop unsaved edits once it has closed
      onOpenChangeComplete={(isOpen) => !isOpen && form.reset()}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {m.list_edit_sale_entry()} — {collectionId}
          </DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex w-full flex-col gap-4"
          >
            {!isTokenKeyed && (
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
            )}

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
                    aria-describedby={positionId}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? null : e.target.valueAsNumber,
                      )
                    }
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            {rateToUsd !== null && (
              <PriceCheck
                slug={slug}
                entryId={objektListEntryId}
                currency={currency}
                rateToUsd={rateToUsd}
                positionId={positionId}
                onViewListings={onViewListings}
              />
            )}

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
