import StatusPill from "@/components/objekt/detail/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAddToList } from "@/hooks/use-add-to-list";
import { m } from "@/i18n/messages";
import { $addObjektToHaveList } from "@/lib/functions/lists";
import {
  $fetchOwnedSerials,
  type OwnedSerial,
} from "@/lib/functions/objekts/owned-serials";
import { cn } from "@/lib/utils";
import type { NonTransferableReason } from "@apollo/cosmo/types/objekts";
import type { ObjektList } from "@apollo/database/web/types";
import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: ObjektList;
  collectionName: string;
  slug: string;
  collectionId: string;
};

export default function SerialPickerDialog({
  open,
  onOpenChange,
  list,
  collectionName,
  slug,
  collectionId,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {m.list_picker_select_serials()} — {collectionName}
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
          <SerialPickerBody
            list={list}
            collectionName={collectionName}
            slug={slug}
            collectionId={collectionId}
            onClose={() => onOpenChange(false)}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

type BodyProps = {
  list: ObjektList;
  collectionName: string;
  slug: string;
  collectionId: string;
  onClose: () => void;
};

function SerialPickerBody({
  list,
  collectionName,
  slug,
  collectionId,
  onClose,
}: BodyProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: owned } = useSuspenseQuery({
    queryKey: ["owned-serials", collectionId],
    queryFn: () => $fetchOwnedSerials({ data: { collectionId } }),
  });

  const mutation = useAddToList({ list, collectionName, onDone: onClose }, () =>
    $addObjektToHaveList({
      data: {
        objektListId: list.id,
        slug,
        collectionName,
        collectionId,
        tokenIds: Array.from(selected),
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

  if (owned.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {m.list_picker_no_copies()}
      </p>
    );
  }

  return (
    <>
      <ScrollArea className="max-h-72 -mx-6">
        <ul className="flex flex-col">
          {owned.map((o) => (
            <li key={o.tokenId}>
              <SerialRow
                serial={o}
                isChecked={selected.has(o.tokenId)}
                onToggle={() => toggle(o.tokenId)}
              />
            </li>
          ))}
        </ul>
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

type SerialRowProps = {
  serial: OwnedSerial;
  isChecked: boolean;
  onToggle: () => void;
};

function SerialRow({ serial, isChecked, onToggle }: SerialRowProps) {
  const isTradable =
    serial.transferable && serial.nonTransferableReason === undefined;
  const disabled = !serial.transferable || serial.locked;
  const paddedSerial = serial.serial.toString().padStart(5, "0");

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="group flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent sm:gap-4 sm:px-5"
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
