import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useArtists } from "@/hooks/use-artists";
import { useHasPermission } from "@/hooks/use-has-permission";
import { m } from "@/i18n/messages";
import type { CurrentUser } from "@/lib/universal/auth";
import { DISCORD_URL } from "@/lib/utils";
import { marketAccess } from "@apollo/auth";
import {
  IconArrowsExchange,
  IconBrandDiscord,
  IconInfoCircle,
  IconLogout,
  IconShieldExclamation,
  IconTool,
  IconUserCog,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ADMIN_SHELL_PERMISSIONS } from "../admin/common";
import AboutDialog from "../navbar/about";
import { ArtistItem } from "../navbar/artist-selectbox";
import UserAvatar from "../profile/user-avatar";

type UserDropdownProps = {
  user: CurrentUser;
  onSignOut: () => void;
};

export default function UserDropdown({ user, onSignOut }: UserDropdownProps) {
  const { artistList, selectedIds } = useArtists();
  const hasPermission = useHasPermission();
  const [openAbout, setOpenAbout] = useState(false);

  return (
    <DropdownMenu>
      <AboutDialog open={openAbout} onOpenChange={setOpenAbout} />

      <DropdownMenuTrigger className="group relative outline-hidden">
        <UserAvatar
          className="h-8 w-8 shadow-sm **:p-1"
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
          className="cursor-pointer"
          render={<Link to="/account" />}
        >
          <IconUserCog className="h-4 w-4" />
          <span>{m.common_account()}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer"
          render={<Link to="/account" hash="preferences" />}
        >
          <IconTool className="h-4 w-4" />
          <span>{m.user_dropdown_settings()}</span>
        </DropdownMenuItem>

        {hasPermission(marketAccess) && (
          <DropdownMenuItem
            className="cursor-pointer"
            render={<Link to="/market/trades" />}
          >
            <IconArrowsExchange className="h-4 w-4" />
            <span>{m.my_trades_title()}</span>
          </DropdownMenuItem>
        )}

        {hasPermission(ADMIN_SHELL_PERMISSIONS) && (
          <div className="contents">
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              render={<Link to="/admin" />}
            >
              <IconShieldExclamation className="h-4 w-4" />
              <span>{m.common_admin()}</span>
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

        <DropdownMenuItem
          className="cursor-pointer"
          render={
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" />
          }
        >
          <IconBrandDiscord className="h-4 w-4" />
          <span>{m.common_discord()}</span>
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
