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
              className="text-sm"
              onClick={() => setDropdownOpen(false)}
            >
              <Link
                to={props.createListUrl(list)}
                className="flex w-full items-center justify-between"
              >
                {list.name}
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
