import {
  OverlayIcon,
  OverlayIconButton,
} from "@/components/objekt/overlay/corner-overlay";
import { useAddToList } from "@/hooks/use-add-to-list";
import { m } from "@/i18n/messages";
import {
  $addObjektsToHaveList,
  $addObjektsToList,
  $addObjektsToWantList,
} from "@/lib/functions/lists";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektList } from "@apollo/database/web/types";
import { IconPlaylistAdd } from "@tabler/icons-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ScrollArea } from "../ui/scroll-area";
import BatchSerialPickerDialog, {
  type PickerMode,
} from "./batch-serial-picker-dialog";
import ListItemShell from "./list-item-shell";

type AddToListProps = {
  collection: Objekt.Collection;
  lists: ObjektList[];
  tokenId?: number;
};

type ClickType = "direct" | "sale" | "serial-picker";

export default function AddToList({
  collection,
  lists,
  tokenId,
}: AddToListProps) {
  const [open, setOpen] = useState(false);
  const [pickerPending, setPickerPending] = useState<
    { list: ObjektList } & PickerMode
  >();
  const collectionName = collection.collectionId;

  function handleClick(list: ObjektList, kind: ClickType) {
    switch (kind) {
      case "sale":
        setOpen(false);
        // objekt_lists_currency_type_chk gives every sale list a currency
        if (list.currency !== null) {
          setPickerPending({ list, mode: "sale", currency: list.currency });
        }
        return;
      case "serial-picker":
        setOpen(false);
        setPickerPending({ list, mode: "have" });
        return;
      case "direct":
        return;
    }
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <OverlayIconButton
              className="outline-hidden"
              aria-label={m.list_select_to_add({
                collectionId: collectionName,
              })}
            />
          }
        >
          <OverlayIcon icon={IconPlaylistAdd} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-fit">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{collectionName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {lists.length === 0 && (
              <DropdownMenuItem className="group truncate text-sm">
                {m.list_zero_lists_available()}
              </DropdownMenuItem>
            )}

            <ScrollArea className="max-h-44 overflow-y-auto">
              {lists.map((list) => {
                const commonProps = {
                  list,
                  collectionName,
                  slug: collection.slug,
                  onDone: () => setOpen(false),
                  onClick: (kind: ClickType) => handleClick(list, kind),
                };
                switch (list.type) {
                  case "regular":
                    return <RegularListItem key={list.id} {...commonProps} />;
                  case "sale":
                    return <SaleListItem key={list.id} {...commonProps} />;
                  case "have":
                    return (
                      <HaveListItem
                        key={list.id}
                        {...commonProps}
                        tokenId={tokenId}
                      />
                    );
                  case "want":
                    return <WantListItem key={list.id} {...commonProps} />;
                  default:
                    list.type satisfies never;
                    return null;
                }
              })}
            </ScrollArea>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {pickerPending && (
        <BatchSerialPickerDialog
          {...pickerPending}
          open={true}
          onOpenChange={(open) => {
            if (!open) setPickerPending(undefined);
          }}
          title={`${pickerPending.mode === "sale" ? m.list_add_to_sale_list() : m.list_picker_select_serials()} — ${collectionName}`}
          collection={collection}
        />
      )}
    </>
  );
}

type ListItemBaseProps = {
  list: ObjektList;
  collectionName: string;
  slug: string;
  onDone: () => void;
  onClick: (kind: ClickType) => void;
};

function RegularListItem(props: ListItemBaseProps) {
  const mutate = useAddToList(props, () =>
    $addObjektsToList({
      data: {
        objektListId: props.list.id,
        slugs: [props.slug],
      },
    }),
  );
  return (
    <ListItemShell
      list={props.list}
      isPending={mutate.isPending}
      onClick={() => {
        props.onClick("direct");
        mutate.mutate();
      }}
    />
  );
}

function WantListItem(props: ListItemBaseProps) {
  const mutate = useAddToList(props, () =>
    $addObjektsToWantList({
      data: {
        objektListId: props.list.id,
        objekts: [{ slug: props.slug }],
      },
    }),
  );
  return (
    <ListItemShell
      list={props.list}
      isPending={mutate.isPending}
      onClick={() => {
        props.onClick("direct");
        mutate.mutate();
      }}
    />
  );
}

type HaveListItemProps = ListItemBaseProps & {
  tokenId: number | undefined;
};

function HaveListItem(props: HaveListItemProps) {
  const mutate = useAddToList(props, () => {
    // caller guarantees tokenId is defined before dispatching the direct path
    if (props.tokenId === undefined) throw new Error("token_id_required");
    return $addObjektsToHaveList({
      data: {
        objektListId: props.list.id,
        objekts: [{ tokenId: String(props.tokenId) }],
      },
    });
  });
  return (
    <ListItemShell
      list={props.list}
      isPending={mutate.isPending}
      onClick={() => {
        if (props.tokenId === undefined) {
          props.onClick("serial-picker");
          return;
        }
        props.onClick("direct");
        mutate.mutate();
      }}
    />
  );
}

function SaleListItem(props: ListItemBaseProps) {
  return (
    <ListItemShell
      list={props.list}
      isPending={false}
      onClick={() => props.onClick("sale")}
    />
  );
}
