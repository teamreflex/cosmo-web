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
import { useBatchAddToList } from "@/hooks/use-add-to-list";
import { m } from "@/i18n/messages";
import { getObjektImageUrls, reasonLabel } from "@/lib/client/objekt-util";
import {
  $addObjektsToHaveList,
  $addObjektsToSaleList,
} from "@/lib/functions/lists";
import {
  $fetchOwnedSerials,
  type OwnedSerial,
} from "@/lib/functions/objekts/owned-serials";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import {
  type SaleListFormValues,
  type addObjektsToSaleListSchema,
  saleListFormSchema,
} from "@/lib/universal/schema/objekt-list";
import { cn } from "@/lib/utils";
import type { ObjektList } from "@apollo/database/web/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import {
  type Control,
  useController,
  useForm,
  useWatch,
} from "react-hook-form";
import type { z } from "zod";

type AddObjektsToSaleListInput = z.infer<typeof addObjektsToSaleListSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: ObjektList;
  mode: "have" | "sale";
  currency?: string;
  collections: Objekt.Collection[];
};

/**
 * Batch serial picker for adding index collections to a have/sale list. The
 * user has selected collections (not owned serials), so this prompts them to
 * pick which copies they own per collection before adding.
 */
export default function BatchSerialPickerDialog({
  open,
  onOpenChange,
  list,
  mode,
  currency,
  collections,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {m.list_picker_select_serials()} — {list.name}
          </DialogTitle>
          <DialogDescription>
            {m.list_picker_description({ listName: list.name })}
          </DialogDescription>
        </DialogHeader>

        <Suspense
          fallback={
            <div className="flex justify-center py-6">
              <IconLoader2 className="h-5 w-5 animate-spin" />
            </div>
          }
        >
          <PickerBody
            list={list}
            mode={mode}
            currency={currency}
            collections={collections}
            onClose={() => onOpenChange(false)}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

type Section = {
  collection: Objekt.Collection;
  serials: OwnedSerial[];
  startIndex: number;
};

type BodyProps = {
  list: ObjektList;
  mode: "have" | "sale";
  currency?: string;
  collections: Objekt.Collection[];
  onClose: () => void;
};

function PickerBody({ list, mode, currency, collections, onClose }: BodyProps) {
  const collectionIds = useMemo(
    () => collections.map((c) => c.id),
    [collections],
  );

  const { data: owned } = useSuspenseQuery({
    queryKey: ["owned-serials", "batch", collectionIds],
    queryFn: () => $fetchOwnedSerials({ data: { collectionIds } }),
  });

  // sections align to a flat row index so the sale form can address each row
  const sections = useMemo(() => {
    const withSerials = collections.map((collection) => ({
      collection,
      serials: owned[collection.id] ?? [],
    }));
    return withSerials.map((item, i) => ({
      ...item,
      startIndex: withSerials
        .slice(0, i)
        .reduce((n, prev) => n + prev.serials.length, 0),
    }));
  }, [collections, owned]);

  const totalOwned = sections.reduce((n, s) => n + s.serials.length, 0);

  if (totalOwned === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {m.list_picker_no_copies()}
      </p>
    );
  }

  if (mode === "sale" && currency) {
    return (
      <SaleBody
        list={list}
        currency={currency}
        sections={sections}
        totalRows={totalOwned}
        onClose={onClose}
      />
    );
  }

  return <HaveBody list={list} sections={sections} onClose={onClose} />;
}

type HaveBodyProps = {
  list: ObjektList;
  sections: Section[];
  onClose: () => void;
};

function HaveBody({ list, sections, onClose }: HaveBodyProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const mutation = useBatchAddToList(
    { list, attempted: selected.size, onDone: onClose },
    () =>
      $addObjektsToHaveList({
        data: {
          objektListId: list.id,
          objekts: sections.flatMap((section) =>
            section.serials
              .filter((s) => selected.has(s.tokenId))
              .map((s) => ({
                slug: section.collection.slug,
                collectionId: section.collection.id,
                collectionName: section.collection.collectionId,
                tokenId: s.tokenId,
              })),
          ),
        },
      }),
  );

  function toggle(tokenId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) next.delete(tokenId);
      else next.add(tokenId);
      return next;
    });
  }

  return (
    <>
      <ScrollArea className="-mx-6 max-h-96">
        <div className="flex flex-col">
          {sections.map((section) => (
            <CollectionSection
              key={section.collection.id}
              collection={section.collection}
              isEmpty={section.serials.length === 0}
            >
              {section.serials.map((serial) => (
                <HaveRow
                  key={serial.tokenId}
                  serial={serial}
                  isChecked={selected.has(serial.tokenId)}
                  onToggle={() => toggle(serial.tokenId)}
                />
              ))}
            </CollectionSection>
          ))}
        </div>
      </ScrollArea>

      <Button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={selected.size === 0 || mutation.isPending}
      >
        <span>
          {m.list_picker_add_count({ count: selected.size.toString() })}
        </span>
        {mutation.isPending && <IconLoader2 className="animate-spin" />}
      </Button>
    </>
  );
}

type SaleBodyProps = {
  list: ObjektList;
  currency: string;
  sections: Section[];
  totalRows: number;
  onClose: () => void;
};

function SaleBody({
  list,
  currency,
  sections,
  totalRows,
  onClose,
}: SaleBodyProps) {
  const form = useForm({
    resolver: standardSchemaResolver(saleListFormSchema),
    defaultValues: {
      rows: Array.from({ length: totalRows }, () => ({
        selected: false,
        price: null,
      })),
    },
  });

  const rows = useWatch({ control: form.control, name: "rows" });
  const selectedCount = rows.filter((row) => row.selected).length;

  const mutation = useBatchAddToList(
    { list, attempted: selectedCount, onDone: onClose },
    (data: AddObjektsToSaleListInput) => $addObjektsToSaleList({ data }),
  );

  async function handleSubmit(data: SaleListFormValues) {
    const entries = sections.flatMap((section) =>
      section.serials.flatMap((serial, j) => {
        const row = data.rows[section.startIndex + j];
        if (row === undefined || !row.selected) return [];
        return [
          {
            slug: section.collection.slug,
            collectionId: section.collection.id,
            collectionName: section.collection.collectionId,
            tokenId: serial.tokenId,
            price: row.price,
          },
        ];
      }),
    );

    if (entries.length === 0) return;
    await mutation.mutateAsync({ objektListId: list.id, entries });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
      <ScrollArea className="-mx-6 max-h-96">
        <div className="flex flex-col">
          {sections.map((section) => (
            <CollectionSection
              key={section.collection.id}
              collection={section.collection}
              isEmpty={section.serials.length === 0}
            >
              {section.serials.map((serial, j) => (
                <SaleRow
                  key={serial.tokenId}
                  index={section.startIndex + j}
                  serial={serial}
                  currency={currency}
                  control={form.control}
                />
              ))}
            </CollectionSection>
          ))}
        </div>
      </ScrollArea>

      <Button
        type="submit"
        disabled={selectedCount === 0 || mutation.isPending}
      >
        <span>
          {m.list_picker_add_count({ count: selectedCount.toString() })}
        </span>
        {mutation.isPending && <IconLoader2 className="animate-spin" />}
      </Button>
    </form>
  );
}

type CollectionSectionProps = {
  collection: Objekt.Collection;
  isEmpty: boolean;
  children: React.ReactNode;
};

function CollectionSection({
  collection,
  isEmpty,
  children,
}: CollectionSectionProps) {
  const { front } = getObjektImageUrls(collection);

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 bg-muted/40 px-4 py-2 sm:px-5">
        <img
          src={front.display}
          alt={collection.collectionId}
          className="h-8 w-auto shrink-0 rounded-xs"
          decoding="async"
        />
        <span className="truncate text-sm font-semibold">
          {collection.collectionId}
        </span>
      </div>

      {isEmpty ? (
        <p className="px-4 py-3 text-sm text-muted-foreground sm:px-5">
          {m.list_picker_no_copies()}
        </p>
      ) : (
        <div className="flex flex-col">{children}</div>
      )}
    </div>
  );
}

type HaveRowProps = {
  serial: OwnedSerial;
  isChecked: boolean;
  onToggle: () => void;
};

function HaveRow({ serial, isChecked, onToggle }: HaveRowProps) {
  const isTradable =
    serial.transferable && serial.nonTransferableReason === undefined;
  const disabled = !serial.transferable || serial.locked;
  const paddedSerial = serial.serial.toString().padStart(5, "0");

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="group flex w-full items-center gap-3 border-t border-border px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent sm:gap-4 sm:px-5"
    >
      <div className="w-20 shrink-0 sm:w-24">
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
        aria-hidden
        data-checked={isChecked}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors",
          "data-[checked=true]:border-primary data-[checked=true]:bg-primary data-[checked=true]:text-primary-foreground",
        )}
      >
        {isChecked && <IconCheck className="size-3.5" />}
      </div>
    </button>
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
        "group flex w-full cursor-pointer items-center gap-3 border-t border-border px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none sm:gap-4 sm:px-5",
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
              const next =
                e.target.value === "" || Number.isNaN(e.target.valueAsNumber)
                  ? null
                  : e.target.valueAsNumber;
              price.onChange(next);
              // typing a price implies the serial should be listed
              if (next !== null) selected.onChange(true);
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
