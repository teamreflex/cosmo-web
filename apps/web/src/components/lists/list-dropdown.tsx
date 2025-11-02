import { useState } from "react";
import { ChevronRight, LetterText, List, PlusCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import CreateListDialog from "./create-list-dialog";
import DiscordFormatDialog from "./discord-format-dialog";
import type { ObjektList } from "@/lib/server/db/schema";
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
import { m } from "@/i18n/messages";

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
          <List className="h-5 w-5" />
          <span className="hidden sm:block">{m.list_lists()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{m.objekt_list()}</DropdownMenuLabel>
        <DropdownMenuSeparator />
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
                <ChevronRight className="h-4 w-4" />
              </Link>
            </DropdownMenuItem>
          ))}
          {props.objektLists.length === 0 && (
            <DropdownMenuItem className="text-sm">{m.list_zero_lists()}</DropdownMenuItem>
          )}

          {props.allowCreate && (
            <div className="contents">
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <PlusCircle className="h-4 w-4" />
                <span className="font-semibold">{m.list_create_new()}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCompareOpen(true)}>
                <LetterText className="h-4 w-4" />
                <span className="font-semibold">{m.list_discord_format()}</span>
              </DropdownMenuItem>
            </div>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
