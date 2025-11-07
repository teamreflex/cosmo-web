import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { artistColors } from "@/lib/utils";

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

  function selectArtist(artist: CosmoArtistWithMembersBFF) {
    onChange(artist.artistMembers.map((m) => m.name));
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <span>Members</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36" align="end">
        <ScrollArea className="h-62">
          {artists.map((artist) => (
            <DropdownMenuItem
              key={artist.name}
              className="gap-2"
              onSelect={(e) => {
                e.preventDefault();
                selectArtist(artist);
              }}
            >
              <img
                src={artist.logoImageUrl}
                alt={artist.title}
                className="size-4 shrink-0 rounded-full"
              />
              <span
                style={{
                  "--artist-color": artistColors[artist.id],
                }}
                className="h-2 w-2 shrink-0 rounded-[2px] bg-(--artist-color)"
              />
              {artist.title}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

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
