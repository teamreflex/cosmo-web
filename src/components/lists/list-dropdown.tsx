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
import type { ObjektList } from "@/lib/server/db/schema";
import Link from "next/link";
import CreateListDialog from "./create-list-dialog";
import DiscordFormatDialog from "./discord-format-dialog";

type Props = {
  objektLists: ObjektList[];
  allowCreate: boolean;
  createListUrl: (list: ObjektList) => string;
};

export default function ListDropdown({
  objektLists,
  allowCreate,
  createListUrl,
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DiscordFormatDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        objektLists={objektLists}
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
          {objektLists.map((list) => (
            <DropdownMenuItem
              key={list.id}
              className="text-sm"
              onClick={() => setDropdownOpen(false)}
            >
              <Link
                href={createListUrl(list)}
                className="w-full flex items-center justify-between"
              >
                {list.name}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </DropdownMenuItem>
          ))}
          {objektLists.length === 0 && (
            <DropdownMenuItem className="text-sm">0 lists</DropdownMenuItem>
          )}

          {allowCreate && (
            <div className="contents">
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <PlusCircle className="h-4 w-4" />
                <span className="font-semibold">Create New</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCompareOpen(true)}>
                <LetterText className="h-4 w-4" />
                <span className="font-semibold">Discord Format</span>
              </DropdownMenuItem>
            </div>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
