import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useArtists } from "@/hooks/use-artists";
import { m } from "@/i18n/messages";
import type { PublicUser } from "@/lib/universal/auth";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import {
  IconBrandDiscord,
  IconInfoCircle,
  IconLogout,
  IconShieldExclamation,
  IconTool,
  IconUserCog,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import AboutDialog from "../navbar/about";
import { ArtistItem } from "../navbar/artist-selectbox";
import UserAvatar from "../profile/user-avatar";
import AccountDialog from "./account-dialog";
import SettingsDialog from "./settings-dialog";

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
  const { artistList } = useArtists();
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
          className="h-8 w-8 **:p-1 shadow-sm"
          username={user.username ?? "Apollo"}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fit">
        <DropdownMenuGroup>
          {artistList
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
          <IconUserCog className="h-4 w-4" />
          <span>{m.common_account()}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setOpenSettings(true)}
          className="cursor-pointer"
        >
          <IconTool className="h-4 w-4" />
          <span>{m.user_dropdown_settings()}</span>
        </DropdownMenuItem>

        {user.isAdmin && (
          <div className="contents">
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link to="/admin">
                <IconShieldExclamation className="h-4 w-4" />
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
          <IconInfoCircle className="h-4 w-4" />
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
          <IconLogout className="h-4 w-4" />
          <span>{m.user_dropdown_sign_out()}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
