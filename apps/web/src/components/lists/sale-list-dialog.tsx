import StatusPill from "@/components/objekt/detail/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { reasonLabel } from "@/lib/client/objekt-util";
import { $addObjektsToSaleList } from "@/lib/functions/lists";
import {
  $fetchOwnedSerials,
  type OwnedSerial,
} from "@/lib/functions/objekts/owned-serials";
import { objektListQueryFilter } from "@/lib/queries/objekt-queries";
import {
  type SaleListFormValues,
  saleListFormSchema,
} from "@/lib/universal/schema/objekt-list";
import { cn } from "@/lib/utils";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense } from "react";
import {
  type Control,
  useController,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objektListId: string;
  listName: string;
  slug: string;
  collectionName: string;
  collectionId: string;
  currency: string;
};

export default function SaleListDialog({
  open,
  onOpenChange,
  objektListId,
  listName,
  slug,
  collectionName,
  collectionId,
  currency,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {m.list_add_to_sale_list()} — {collectionName}
          </DialogTitle>
          <DialogDescription>
            {m.list_picker_description({ listName })}
          </DialogDescription>
        </DialogHeader>

        <Suspense
          fallback={
            <div className="flex justify-center py-6">
              <IconLoader2 className="h-5 w-5 animate-spin" />
            </div>
          }
        >
          <SaleListBody
            objektListId={objektListId}
            listName={listName}
            slug={slug}
            collectionName={collectionName}
            collectionId={collectionId}
            currency={currency}
            onClose={() => onOpenChange(false)}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

type BodyProps = {
  objektListId: string;
  listName: string;
  slug: string;
  collectionName: string;
  collectionId: string;
  currency: string;
  onClose: () => void;
};

function SaleListBody({
  objektListId,
  listName,
  slug,
  collectionName,
  collectionId,
  currency,
  onClose,
}: BodyProps) {
  const queryClient = useQueryClient();
  const { data: owned } = useSuspenseQuery({
    queryKey: ["owned-serials", collectionId],
    queryFn: () => $fetchOwnedSerials({ data: { collectionId } }),
  });

  const mutation = useMutation({
    mutationFn: $addObjektsToSaleList,
    onSuccess: async () => {
      toast.success(
        m.toast_added_to_list({ collectionId: collectionName, listName }),
      );
      await queryClient.invalidateQueries(objektListQueryFilter(objektListId));
      onClose();
    },
    onError: (error) =>
      toast.error(formatError(error, { collectionId: collectionName })),
  });

  const form = useForm({
    resolver: standardSchemaResolver(saleListFormSchema),
    defaultValues: {
      rows: owned.map(() => ({ selected: false, price: null })),
    },
  });

  async function handleSubmit(data: SaleListFormValues) {
    const entries = owned.flatMap((serial, i) => {
      const row = data.rows[i];
      if (row === undefined || !row.selected) return [];
      return [
        {
          slug,
          collectionId,
          collectionName,
          tokenId: serial.tokenId,
          price: row.price,
        },
      ];
    });

    if (entries.length === 0) return;
    await mutation.mutateAsync({ data: { objektListId, entries } });
  }

  if (owned.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {m.list_picker_no_copies()}
      </p>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
      <ScrollArea className="-mx-6 max-h-72">
        <ul className="flex flex-col">
          {owned.map((o, i) => (
            <li key={o.tokenId}>
              <SaleRow
                index={i}
                serial={o}
                currency={currency}
                control={form.control}
              />
            </li>
          ))}
        </ul>
      </ScrollArea>

      <SubmitButton control={form.control} isPending={mutation.isPending} />
    </form>
  );
}

function SubmitButton({
  control,
  isPending,
}: {
  control: Control<SaleListFormValues>;
  isPending: boolean;
}) {
  const rows = useWatch({ control, name: "rows" });
  const selectedCount = rows.filter((row) => row.selected).length;

  return (
    <Button type="submit" disabled={selectedCount === 0 || isPending}>
      <span>
        {m.list_picker_add_count({ count: selectedCount.toString() })}
      </span>
      {isPending && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}

type SaleRowProps = {
  index: number;
  serial: OwnedSerial;
  currency: string;
  control: Control<SaleListFormValues>;
};

function SaleRow({ index, serial, currency, control }: SaleRowProps) {
  const { field: selected } = useController({
    control,
    name: `rows.${index}.selected`,
  });
  const { field: price, fieldState } = useController({
    control,
    name: `rows.${index}.price`,
  });

  const isTradable =
    serial.transferable && serial.nonTransferableReason === undefined;
  const disabled = !serial.transferable || serial.locked;
  const paddedSerial = serial.serial.toString().padStart(5, "0");

  function toggle() {
    if (disabled) return;
    selected.onChange(!selected.value);
  }

  return (
    <div
      role="checkbox"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-checked={selected.value}
      onClick={toggle}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none sm:gap-4 sm:px-5",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
      )}
    >
      <div className="w-16 shrink-0 sm:w-20">
        <div className="font-mono text-xxs tracking-[0.14em] text-muted-foreground uppercase">
          {m.detail_sort_serial()}
        </div>
        <div className="font-mono text-sm font-bold tabular-nums sm:text-lg">
          #{paddedSerial}
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        {serial.locked && (
          <StatusPill tone="muted">{m.common_locked()}</StatusPill>
        )}
        {isTradable && (
          <StatusPill tone="accent">{m.common_tradable()}</StatusPill>
        )}
        {!isTradable && serial.nonTransferableReason && (
          <StatusPill tone="muted">
            {reasonLabel(serial.nonTransferableReason)}
          </StatusPill>
        )}
      </div>

      <div
        className="w-28 shrink-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="relative">
          <Input
            type="number"
            min={0}
            step="any"
            placeholder={m.list_sale_price()}
            value={price.value ?? ""}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
            onChange={(e) => {
              const next = e.target.valueAsNumber;
              price.onChange(
                e.target.value === "" || Number.isNaN(next) ? null : next,
              );
            }}
            className="[appearance:textfield] pr-11 text-right tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            aria-label={`${m.list_sale_price()} (${currency})`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center font-mono text-xs text-muted-foreground uppercase">
            {currency}
          </span>
        </div>
        {fieldState.error && (
          <p className="mt-1 text-xxs text-destructive">
            {fieldState.error.message}
          </p>
        )}
      </div>

      <div
        aria-hidden
        data-checked={selected.value}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors",
          "data-[checked=true]:border-primary data-[checked=true]:bg-primary data-[checked=true]:text-primary-foreground",
        )}
      >
        {selected.value && <IconCheck className="size-3.5" />}
      </div>
    </div>
  );
}
