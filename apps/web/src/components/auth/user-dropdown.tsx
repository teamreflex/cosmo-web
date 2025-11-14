import { Info, LogOut, ShieldAlert, UserCog, Wrench } from "lucide-react";
import { useState } from "react";
import { IconBrandDiscord } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { ArtistItem } from "../navbar/artist-selectbox";
import UserAvatar from "../profile/user-avatar";
import AboutDialog from "../navbar/about";
import SettingsDialog from "./settings-dialog";
import AccountDialog from "./account-dialog";
import type { PublicUser } from "@/lib/universal/auth";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { useArtists } from "@/hooks/use-artists";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { m } from "@/i18n/messages";

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
  const [openAbout, setOpenAbout] = useState(false);

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
      <AboutDialog open={openAbout} onOpenChange={setOpenAbout} />

      <DropdownMenuTrigger className="group outline-hidden">
        <UserAvatar
          className="h-8 w-8 **:p-1"
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
          <span>{m.common_account()}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setOpenSettings(true)}
          className="cursor-pointer"
        >
          <Wrench className="h-4 w-4" />
          <span>{m.user_dropdown_settings()}</span>
        </DropdownMenuItem>

        {user.isAdmin && (
          <div className="contents">
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link to="/admin">
                <ShieldAlert className="h-4 w-4" />
                <span>{m.common_admin()}</span>
              </Link>
            </DropdownMenuItem>
          </div>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => setOpenAbout(true)}
          className="cursor-pointer"
        >
          <Info className="h-4 w-4" />
          <span>{m.logo_about()}</span>
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer" asChild>
          <a href="https://discord.gg/A72VRX8FgK" target="_blank">
            <IconBrandDiscord className="h-4 w-4" />
            <span>{m.common_discord()}</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onSignOut()}
          className="cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>{m.user_dropdown_sign_out()}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
