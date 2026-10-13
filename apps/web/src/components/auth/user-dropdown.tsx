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
import { tradesNeedingYouQuery } from "@/lib/queries/trades";
import type { CurrentUser } from "@/lib/universal/auth";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { DISCORD_URL } from "@/lib/utils";
import {
  IconArrowsExchange,
  IconBrandDiscord,
  IconInfoCircle,
  IconLogout,
  IconShieldExclamation,
  IconTool,
  IconUserCog,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ADMIN_SHELL_PERMISSIONS } from "../admin/common";
import AboutDialog from "../navbar/about";
import { ArtistItem } from "../navbar/artist-selectbox";
import UserAvatar from "../profile/user-avatar";
import AccountDialog from "./account-dialog";
import SettingsDialog from "./settings-dialog";

type UserDropdownProps = {
  user: CurrentUser;
  cosmo?: PublicCosmo;
  onSignOut: () => void;
};

export default function UserDropdown({
  user,
  cosmo,
  onSignOut,
}: UserDropdownProps) {
  const { artistList, selectedIds } = useArtists();
  const hasPermission = useHasPermission();
  const [openSettings, setOpenSettings] = useState(false);
  const [openAccount, setOpenAccount] = useState(false);
  const [openAbout, setOpenAbout] = useState(false);
  const needsYou = useQuery(tradesNeedingYouQuery).data ?? 0;

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

      <DropdownMenuTrigger className="group relative outline-hidden">
        <UserAvatar
          className="h-8 w-8 shadow-sm **:p-1"
          username={user.username ?? "Apollo"}
        />
        {needsYou > 0 && (
          <span className="sr-only">
            {m.my_trades_label_count({ count: needsYou })}
          </span>
        )}
        {needsYou > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cosmo px-1 text-xxs font-semibold text-white tabular-nums ring-2 ring-background"
          >
            {needsYou > 99 ? "99+" : needsYou}
          </span>
        )}
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

        <DropdownMenuItem
          className="cursor-pointer"
          render={<Link to="/market/trades" />}
        >
          <IconArrowsExchange className="h-4 w-4" />
          <span>{m.my_trades_title()}</span>
          {needsYou > 0 && (
            <span className="ml-auto pl-3 font-mono text-xs text-cosmo tabular-nums dark:text-cosmo-text">
              {needsYou}
            </span>
          )}
        </DropdownMenuItem>

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
