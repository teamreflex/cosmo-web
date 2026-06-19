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
import { useObjektSelection } from "@/hooks/use-objekt-selection";
import { m } from "@/i18n/messages";
import { getObjektImageUrls } from "@/lib/client/objekt-util";
import { $addObjektsToSaleList } from "@/lib/functions/lists";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektList } from "@apollo/database/web/types";
import { IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: ObjektList;
  currency: string;
};

export default function BatchSaleListDialog({
  open,
  onOpenChange,
  list,
  currency,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {m.batch_sale_title({ listName: list.name })}
          </DialogTitle>
          <DialogDescription>{m.batch_sale_description()}</DialogDescription>
        </DialogHeader>

        <BatchSaleBody
          list={list}
          currency={currency}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

type BodyProps = {
  list: ObjektList;
  currency: string;
  onClose: () => void;
};

function BatchSaleBody({ list, currency, onClose }: BodyProps) {
  const selected = useObjektSelection((state) => state.selected);
  const [prices, setPrices] = useState<Map<number, number | null>>(new Map());

  // only transferable serials can be listed for sale
  const eligible = selected.filter((s) => s.token.transferable);

  const mutation = useBatchAddToList(
    {
      list,
      attempted: eligible.length,
      notTradable: selected.length - eligible.length,
      onDone: onClose,
    },
    () =>
      $addObjektsToSaleList({
        data: {
          objektListId: list.id,
          entries: eligible.map((s) => ({
            slug: s.collection.slug,
            collectionId: s.collection.id,
            collectionName: s.collection.collectionId,
            tokenId: String(s.token.tokenId),
            price: prices.get(s.token.tokenId) ?? null,
          })),
        },
      }),
  );

  function setPrice(tokenId: number, price: number | null) {
    setPrices((prev) => {
      const next = new Map(prev);
      next.set(tokenId, price);
      return next;
    });
  }

  if (eligible.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {m.batch_none_eligible({ listName: list.name })}
      </p>
    );
  }

  return (
    <>
      <ScrollArea className="-mx-6 max-h-72">
        <ul className="flex flex-col">
          {eligible.map((s) => (
            <li key={s.token.tokenId}>
              <BatchSaleRow
                collection={s.collection}
                token={s.token}
                currency={currency}
                price={prices.get(s.token.tokenId) ?? null}
                onPriceChange={(value) => setPrice(s.token.tokenId, value)}
              />
            </li>
          ))}
        </ul>
      </ScrollArea>

      <Button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        <span>
          {m.list_picker_add_count({ count: eligible.length.toString() })}
        </span>
        {mutation.isPending && <IconLoader2 className="animate-spin" />}
      </Button>
    </>
  );
}

type RowProps = {
  collection: Objekt.Collection;
  token: Objekt.Token;
  currency: string;
  price: number | null;
  onPriceChange: (value: number | null) => void;
};

function BatchSaleRow({
  collection,
  token,
  currency,
  price,
  onPriceChange,
}: RowProps) {
  const { front } = getObjektImageUrls(collection);
  const paddedSerial = token.serial.toString().padStart(5, "0");

  return (
    <div className="flex w-full items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:gap-4 sm:px-5">
      <img
        src={front.display}
        alt={collection.collectionId}
        className="h-12 w-auto shrink-0 rounded-xs"
        decoding="async"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">
          {collection.collectionId}
        </span>
        <span className="font-mono text-xxs tracking-[0.14em] text-muted-foreground tabular-nums">
          #{paddedSerial}
        </span>
      </div>

      <div className="relative w-28 shrink-0">
        <Input
          type="number"
          min={0}
          step="any"
          placeholder={m.list_sale_price()}
          value={price ?? ""}
          onChange={(e) =>
            onPriceChange(e.target.value === "" ? null : e.target.valueAsNumber)
          }
          className="[appearance:textfield] pr-11 text-right tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={`${m.list_sale_price()} (${currency})`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center font-mono text-xs text-muted-foreground uppercase">
          {currency}
        </span>
      </div>
    </div>
  );
}
