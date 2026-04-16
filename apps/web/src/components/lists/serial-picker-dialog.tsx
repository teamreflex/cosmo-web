import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAddToList } from "@/hooks/use-add-to-list";
import { m } from "@/i18n/messages";
import { $addObjektToHaveList } from "@/lib/functions/lists";
import { $fetchOwnedSerials } from "@/lib/functions/objekts/owned-serials";
import type { ObjektList } from "@apollo/database/web/types";
import { IconLoader2, IconLock } from "@tabler/icons-react";
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{m.list_picker_select_serials()}</DialogTitle>
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

  function toggle(tokenId: string, disabled: boolean) {
    if (disabled) return;
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
      <ScrollArea className="max-h-72">
        <ul className="flex flex-col gap-1">
          {owned.map((o) => {
            const disabled = !o.transferable || o.locked;
            const isChecked = selected.has(o.tokenId);
            const reason = o.locked
              ? m.list_picker_disabled_locked()
              : m.list_picker_disabled_nontransferable();

            const row = (
              <button
                type="button"
                onClick={() => toggle(o.tokenId, disabled)}
                disabled={disabled}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <Checkbox
                    checked={isChecked}
                    disabled={disabled}
                    tabIndex={-1}
                  />
                  <Badge variant="secondary">
                    #{o.serial.toString().padStart(5, "0")}
                  </Badge>
                </span>
                {o.locked && <IconLock className="h-4 w-4" />}
              </button>
            );

            return (
              <li key={o.tokenId}>
                {disabled ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="contents">{row}</span>
                    </TooltipTrigger>
                    <TooltipContent>{reason}</TooltipContent>
                  </Tooltip>
                ) : (
                  row
                )}
              </li>
            );
          })}
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
