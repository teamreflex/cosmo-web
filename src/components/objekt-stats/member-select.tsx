"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { ScrollArea } from "../ui/scroll-area";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  value?: string[];
  onChange: (value: string[]) => void;
};

export default function MemberSelect({ artists, value = [], onChange }: Props) {
  const [open, setOpen] = useState(false);

  function onSelect(member: string, isChecked: boolean) {
    if (isChecked) {
      onChange([...value, member]);
    } else {
      onChange(value.filter((m) => m !== member));
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex gap-2 items-center">
          <span>Members</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36" align="end">
        <ScrollArea className="h-52">
          {artists
            .flatMap((a) => a.artistMembers)
            .map((member) => (
              <DropdownMenuCheckboxItem
                key={member.name}
                checked={value.includes(member.name)}
                onCheckedChange={(checked) => onSelect(member.name, checked)}
                className="gap-2"
                onSelect={(e) => e.preventDefault()}
              >
                <span
                  style={{
                    "--member-color": member.primaryColorHex,
                  }}
                  className="h-2 w-2 shrink-0 rounded-[2px] bg-(--member-color)"
                />
                {member.name}
              </DropdownMenuCheckboxItem>
            ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
