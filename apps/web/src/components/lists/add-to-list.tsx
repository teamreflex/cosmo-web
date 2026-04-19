import { useAddToList } from "@/hooks/use-add-to-list";
import { m } from "@/i18n/messages";
import {
  $addObjektToHaveList,
  $addObjektToList,
  $addObjektToWantList,
} from "@/lib/functions/lists";
import type { ObjektList } from "@apollo/database/web/types";
import { IconLoader2, IconPlaylistAdd, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { Badge } from "../ui/badge";
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
import SaleListDialog from "./sale-list-dialog";
import SerialPickerDialog from "./serial-picker-dialog";

type AddToListProps = {
  collectionName: string;
  slug: string;
  collectionId: string;
  lists: ObjektList[];
  tokenId?: number;
};

type ClickType = "direct" | "sale" | "serial-picker";

export default function AddToList({
  collectionName,
  slug,
  collectionId,
  lists,
  tokenId,
}: AddToListProps) {
  const [open, setOpen] = useState(false);
  const [saleListPending, setSaleListPending] = useState<ObjektList>();
  const [serialPickerPending, setSerialPickerPending] = useState<ObjektList>();

  function handleClick(list: ObjektList, kind: ClickType) {
    switch (kind) {
      case "sale":
        setOpen(false);
        setSaleListPending(list);
        return;
      case "serial-picker":
        setOpen(false);
        setSerialPickerPending(list);
        return;
      case "direct":
        return;
    }
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            onClick={() => setOpen((state) => !state)}
            className="flex items-center outline-hidden transition-all hover:scale-110"
            aria-label={m.list_select_to_add({ collectionId: collectionName })}
          >
            <IconPlaylistAdd className="h-3 w-3 sm:h-5 sm:w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-fit">
          <DropdownMenuLabel>{collectionName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
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
                  slug,
                  collectionId,
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

      {saleListPending?.currency && (
        <SaleListDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setSaleListPending(undefined);
          }}
          objektListId={saleListPending.id}
          listName={saleListPending.name}
          slug={slug}
          collectionName={collectionName}
          collectionId={collectionId}
          currency={saleListPending.currency}
        />
      )}

      {serialPickerPending && (
        <SerialPickerDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setSerialPickerPending(undefined);
          }}
          list={serialPickerPending}
          slug={slug}
          collectionName={collectionName}
          collectionId={collectionId}
        />
      )}
    </>
  );
}

type ListItemBaseProps = {
  list: ObjektList;
  collectionName: string;
  slug: string;
  collectionId: string;
  onDone: () => void;
  onClick: (kind: ClickType) => void;
};

function RegularListItem(props: ListItemBaseProps) {
  const mutate = useAddToList(props, () =>
    $addObjektToList({
      data: {
        objektListId: props.list.id,
        slug: props.slug,
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
    $addObjektToWantList({
      data: {
        objektListId: props.list.id,
        slug: props.slug,
        collectionName: props.collectionName,
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
    return $addObjektToHaveList({
      data: {
        objektListId: props.list.id,
        slug: props.slug,
        collectionName: props.collectionName,
        collectionId: props.collectionId,
        tokenIds: [String(props.tokenId)],
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

type ListItemShellProps = {
  list: ObjektList;
  isPending: boolean;
  onClick: () => void;
};

function ListItemShell({ list, isPending, onClick }: ListItemShellProps) {
  return (
    <DropdownMenuItem className="group truncate">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          onClick();
        }}
        disabled={isPending}
        className="flex w-full items-center justify-between gap-2"
        aria-label={m.list_add_to_list_named({ listName: list.name })}
      >
        <div className="flex items-center gap-1.5 text-sm">
          <span>{list.name}</span>
          <span className="text-xs">
            {list.type === "have" && (
              <Badge variant="list-have">{m.list_type_have()}</Badge>
            )}
            {list.type === "want" && (
              <Badge variant="list-want">{m.list_type_want()}</Badge>
            )}
            {list.type === "sale" && list.currency && (
              <Badge variant="secondary">{list.currency}</Badge>
            )}
          </span>
        </div>
        {isPending ? (
          <IconLoader2 className="h-4 w-4 animate-spin" />
        ) : (
          <IconPlus className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100" />
        )}
      </button>
    </DropdownMenuItem>
  );
}
