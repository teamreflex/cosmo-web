import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, ShieldAlert, UserCog, Wrench } from "lucide-react";
import { useState } from "react";
import SettingsDialog from "./settings-dialog";
import Link from "next/link";
import { IconBrandDiscord } from "@tabler/icons-react";
import { PublicUser } from "@/lib/universal/auth";
import { ArtistItem } from "../navbar/artist-selectbox";
import { useArtists } from "@/hooks/use-artists";
import UserAvatar from "../profile/user-avatar";
import AccountDialog from "./account-dialog";
import { PublicCosmo } from "@/lib/universal/cosmo-accounts";

type UserDropdownProps = {
  user: PublicUser;
  cosmo?: PublicCosmo;
  onSignOut: () => void;
};

export default function UserDropdown({
  user,
  cosmo,
  onSignOut,
}: UserDropdownProps) {
  const { artists } = useArtists();
  const { selectedIds } = useArtists();
  const [openSettings, setOpenSettings] = useState(false);
  const [openAccount, setOpenAccount] = useState(false);

  return (
    <DropdownMenu>
      <SettingsDialog
        open={openSettings}
        onOpenChange={setOpenSettings}
        user={user}
      />
      <AccountDialog
        open={openAccount}
        onOpenChange={setOpenAccount}
        cosmo={cosmo}
      />

      <DropdownMenuTrigger className="group outline-hidden">
        <UserAvatar
          className="w-8 h-8 **:p-1"
          username={user.username ?? "Apollo"}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {artists
            .sort((a, b) => a.comoTokenId - b.comoTokenId)
            .map((artist) => (
              <ArtistItem
                key={artist.id}
                artist={artist}
                isSelected={selectedIds.includes(artist.id)}
              />
            ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => setOpenAccount(true)}
          className="cursor-pointer"
        >
          <UserCog className="h-4 w-4" />
          <span>Account</span>
        </DropdownMenuItem>

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
