import ListItemShell from "@/components/lists/list-item-shell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBatchAddToList } from "@/hooks/use-add-to-list";
import { m } from "@/i18n/messages";
import { $addObjektsToWantList } from "@/lib/functions/lists";
import { currentAccountQuery } from "@/lib/queries/core";
import type { EditionLedger } from "@/lib/universal/grid";
import type { ObjektList } from "@apollo/database/web/types";
import { IconPlaylistAdd } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

type Props = {
  member: string;
  season: string;
  deficits: EditionLedger["deficits"];
};

/**
 * Adds the objekts missing for the next grid of an edition to one of the
 * viewer's want lists.
 */
export default function AddMissingMenu(props: Props) {
  const [open, setOpen] = useState(false);
  const { data: account } = useSuspenseQuery(currentAccountQuery);
  const wantLists =
    account?.objektLists.filter((list) => list.type === "want") ?? [];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="xs">
          <IconPlaylistAdd className="size-3.5" />
          {m.grid_add_missing()} ({props.deficits.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-fit">
        <DropdownMenuLabel>
          {m.grid_missing_for_next({
            count: props.deficits.length.toString(),
          })}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {wantLists.length === 0 && (
            <DropdownMenuItem className="group truncate text-sm">
              {m.list_zero_lists_available()}
            </DropdownMenuItem>
          )}

          <ScrollArea className="max-h-44 overflow-y-auto">
            {wantLists.map((list) => (
              <WantListItem
                key={list.id}
                list={list}
                {...props}
                onDone={() => setOpen(false)}
              />
            ))}
          </ScrollArea>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WantListItem(props: Props & { list: ObjektList; onDone: () => void }) {
  const mutation = useBatchAddToList(
    {
      list: props.list,
      attempted: props.deficits.length,
      onDone: props.onDone,
    },
    () =>
      $addObjektsToWantList({
        data: {
          objektListId: props.list.id,
          objekts: props.deficits.map((deficit) => ({
            slug: deficit.slug,
            collectionName: `${props.season} ${props.member} ${deficit.collectionNo}${deficit.slug.slice(-1).toUpperCase()}`,
          })),
        },
      }),
  );

  return (
    <ListItemShell
      list={props.list}
      isPending={mutation.isPending}
      onClick={() => mutation.mutate()}
    />
  );
}
