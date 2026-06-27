import { m } from "@/i18n/messages";
import type { ObjektList } from "@apollo/database/web/types";
import { IconLoader2, IconPlus } from "@tabler/icons-react";
import { Badge } from "../ui/badge";
import { DropdownMenuItem } from "../ui/dropdown-menu";

type Props = {
  list: ObjektList;
  isPending: boolean;
  onClick: () => void;
};

/**
 * Dropdown row for adding objekt(s) to a list, showing the list name plus a
 * type badge. Shared by the single and batch add-to-list flows.
 */
export default function ListItemShell({ list, isPending, onClick }: Props) {
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
