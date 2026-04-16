import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { m } from "@/i18n/messages";
import type { ObjektList } from "@apollo/database/web/types";
import {
  IconChevronRight,
  IconCirclePlus,
  IconLetterCase,
  IconList,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import CreateListDialog from "./create-list-dialog";
import DiscordFormatDialog from "./discord-format-dialog";

type Props = {
  objektLists: ObjektList[];
  allowCreate: boolean;
  createListUrl: (list: ObjektList) => string;
  username?: string;
};

export default function ListDropdown(props: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <CreateListDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        username={props.username}
      />
      <DiscordFormatDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        objektLists={props.objektLists}
      />

      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="profile" data-profile>
          <IconList className="h-5 w-5" />
          <span className="hidden sm:block">{m.list_lists()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fit">
        <DropdownMenuGroup>
          {props.objektLists.map((list) => (
            <DropdownMenuItem
              key={list.id}
              onClick={() => setDropdownOpen(false)}
            >
              <Link
                to={props.createListUrl(list)}
                className="flex w-full items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{list.name}</span>

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
                <IconChevronRight className="h-4 w-4" />
              </Link>
            </DropdownMenuItem>
          ))}
          {props.objektLists.length === 0 && (
            <DropdownMenuItem className="text-sm">
              {m.list_zero_lists()}
            </DropdownMenuItem>
          )}

          {props.allowCreate && (
            <div className="contents">
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <IconCirclePlus className="h-4 w-4" />
                <span className="font-semibold">{m.list_create_new()}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCompareOpen(true)}>
                <IconLetterCase className="h-4 w-4" />
                <span className="font-semibold">{m.list_discord_format()}</span>
              </DropdownMenuItem>
            </div>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
