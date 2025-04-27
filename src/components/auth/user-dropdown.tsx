import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, ShieldAlert, Wrench } from "lucide-react";
import { useState } from "react";
import SettingsDialog from "./settings-dialog";
import Link from "next/link";
import { IconBrandDiscord } from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { User } from "@/lib/universal/auth";
import { useSelectedArtists } from "@/hooks/use-selected-artists";
import { ArtistItem } from "../navbar/artist-selectbox";

type UserDropdownProps = {
  user: User;
  onSignOut: () => void;
};

export default function UserDropdown({ user, onSignOut }: UserDropdownProps) {
  const { artists, selectedIds, handleSelect } = useSelectedArtists();
  const [openSettings, setOpenSettings] = useState(false);

  return (
    <DropdownMenu>
      <SettingsDialog
        open={openSettings}
        onOpenChange={setOpenSettings}
        user={user}
      />

      <DropdownMenuTrigger className="group outline-hidden">
        <Avatar>
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {artists
            .sort((a, b) => a.comoTokenId - b.comoTokenId)
            .map((artist) => (
              <ArtistItem
                key={artist.id}
                artist={artist}
                onSelect={handleSelect}
                isSelected={selectedIds.includes(artist.id)}
              />
            ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => setOpenSettings(true)}
          className="cursor-pointer"
        >
          <Wrench className="h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer" asChild>
          <a href="https://discord.gg/A72VRX8FgK" target="_blank">
            <IconBrandDiscord className="h-4 w-4" />
            <span>Discord</span>
          </a>
        </DropdownMenuItem>

        {user.isAdmin && (
          <div className="contents">
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link href="/admin">
                <ShieldAlert className="h-4 w-4" />
                <span>Admin</span>
              </Link>
            </DropdownMenuItem>
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onSignOut()}
          className="cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
