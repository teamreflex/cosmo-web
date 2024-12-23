"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ChevronRight, LetterText, List, PlusCircle } from "lucide-react";
import { ObjektList } from "@/lib/universal/objekts";
import Link from "next/link";
import CreateListDialog from "./create-list-dialog";
import DiscordFormatDialog from "./discord-format-dialog";

type Props = {
  lists: ObjektList[];
  nickname: string;
  allowCreate: boolean;
};

export default function ListDropdown({ lists, nickname, allowCreate }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DiscordFormatDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        lists={lists}
      />

      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="profile" data-profile>
          <List className="h-5 w-5" />
          <span className="hidden sm:block">Lists</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Objekt Lists</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {lists.map((list) => (
            <DropdownMenuItem
              key={list.id}
              className="text-sm"
              onClick={() => setDropdownOpen(false)}
            >
              <Link
                href={`/@${nickname}/list/${list.slug}`}
                className="w-full flex items-center justify-between"
              >
                {list.name}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </DropdownMenuItem>
          ))}
          {lists.length === 0 && (
            <DropdownMenuItem className="text-sm">0 lists</DropdownMenuItem>
          )}

          {allowCreate && (
            <div className="contents">
              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setCreateOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="font-semibold">Create New</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setCompareOpen(true)}
              >
                <LetterText className="mr-2 h-4 w-4" />
                <span className="font-semibold">Discord Format</span>
              </DropdownMenuItem>
            </div>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
