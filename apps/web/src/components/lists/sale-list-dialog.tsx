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
import { $addObjektToSaleList } from "@/lib/functions/lists";
import {
  $fetchOwnedSerials,
  type OwnedSerial,
} from "@/lib/functions/objekts/owned-serials";
import { objektListQueryFilter } from "@/lib/queries/objekt-queries";
import { cn } from "@/lib/utils";
import type { NonTransferableReason } from "@apollo/cosmo/types/objekts";
import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense, useState } from "react";
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prices, setPrices] = useState<Map<string, number | null>>(new Map());

  const queryClient = useQueryClient();
  const { data: owned } = useSuspenseQuery({
    queryKey: ["owned-serials", collectionId],
    queryFn: () => $fetchOwnedSerials({ data: { collectionId } }),
  });

  const mutation = useMutation({
    mutationFn: $addObjektToSaleList,
    onSuccess: async () => {
      toast.success(
        m.toast_added_to_list({ collectionId: collectionName, listName }),
      );
      await queryClient.invalidateQueries(objektListQueryFilter(objektListId));
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  function toggle(tokenId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) next.delete(tokenId);
      else next.add(tokenId);
      return next;
    });
  }

  function setPrice(tokenId: string, price: number | null) {
    setPrices((prev) => {
      const next = new Map(prev);
      next.set(tokenId, price);
      return next;
    });
  }

  function submit() {
    const entries = Array.from(selected).map((tokenId) => ({
      tokenId,
      price: prices.get(tokenId) ?? null,
    }));

    mutation.mutate({
      data: {
        objektListId,
        slug,
        collectionName,
        collectionId,
        entries,
      },
    });
  }

  if (owned.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {m.list_picker_no_copies()}
      </p>
    );
  }

  return (
    <>
      <ScrollArea className="-mx-6 max-h-72">
        <ul className="flex flex-col">
          {owned.map((o) => (
            <li key={o.tokenId}>
              <SaleRow
                serial={o}
                isChecked={selected.has(o.tokenId)}
                price={prices.get(o.tokenId) ?? null}
                currency={currency}
                onToggle={() => toggle(o.tokenId)}
                onPriceChange={(value) => setPrice(o.tokenId, value)}
              />
            </li>
          ))}
        </ul>
      </ScrollArea>

      <Button
        type="button"
        onClick={submit}
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

type SaleRowProps = {
  serial: OwnedSerial;
  isChecked: boolean;
  price: number | null;
  currency: string;
  onToggle: () => void;
  onPriceChange: (value: number | null) => void;
};

function SaleRow({
  serial,
  isChecked,
  price,
  currency,
  onToggle,
  onPriceChange,
}: SaleRowProps) {
  const isTradable =
    serial.transferable && serial.nonTransferableReason === undefined;
  const disabled = !serial.transferable || serial.locked;
  const paddedSerial = serial.serial.toString().padStart(5, "0");

  function handleClick() {
    if (disabled) return;
    onToggle();
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-pressed={isChecked}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
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
        className="relative w-28 shrink-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <Input
          type="number"
          min={0}
          step="any"
          placeholder={m.list_sale_price()}
          value={price ?? ""}
          disabled={disabled}
          onChange={(e) =>
            onPriceChange(e.target.value === "" ? null : e.target.valueAsNumber)
          }
          className="pr-11 text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={`${m.list_sale_price()} (${currency})`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs font-mono uppercase text-muted-foreground">
          {currency}
        </span>
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
    </div>
  );
}

function reasonLabel(reason: NonTransferableReason): string {
  switch (reason) {
    case "mint-pending":
      return m.objekt_overlay_mint_pending();
    case "welcome-objekt":
      return m.objekt_overlay_welcome_reward();
    case "used-for-grid":
      return m.objekt_overlay_used_for_grid();
    case "challenge-reward":
      return m.objekt_overlay_event_reward();
    case "not-transferable":
    default:
      return m.objekt_overlay_not_transferable();
  }
}
