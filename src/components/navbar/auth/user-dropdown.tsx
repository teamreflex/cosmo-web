import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LuDisc3,
  LuLogOut,
  LuShield,
  LuShieldAlert,
  LuWrench,
} from "react-icons/lu";
import { ReactNode, useState } from "react";
import SwitchArtistDialog from "./switch-artist-dialog";
import { CosmoArtist } from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import PrivacyDialog from "./privacy-dialog";
import SettingsDialog from "./settings-dialog";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import Link from "next/link";
import { TbBrandDiscord } from "react-icons/tb";

type UserDropdownProps = {
  profile: PublicProfile;
  artists: CosmoArtist[];
  selectedArtist: ValidArtist;
  comoBalances: ReactNode;
  onSignOut: () => void;
  cosmoAvatar: ReactNode;
};

export default function UserDropdown({
  cosmoAvatar,
  profile,
  artists,
  selectedArtist,
  comoBalances,
  onSignOut,
}: UserDropdownProps) {
  const [openArtistSwitch, setOpenArtistSwitch] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  return (
    <DropdownMenu>
      <SwitchArtistDialog
        open={openArtistSwitch}
        onOpenChange={setOpenArtistSwitch}
        artists={artists}
        selectedArtist={selectedArtist}
      />

      <PrivacyDialog
        open={openPrivacy}
        onOpenChange={setOpenPrivacy}
        profile={profile}
      />

      <SettingsDialog
        open={openSettings}
        onOpenChange={setOpenSettings}
        profile={profile}
      />

      <DropdownMenuTrigger className="group outline-hidden">
        {cosmoAvatar}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="md:hidden flex gap-2 items-center">
          {comoBalances}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="md:hidden" />

        <DropdownMenuItem
          onClick={() => setOpenArtistSwitch(true)}
          className="cursor-pointer"
        >
          <LuDisc3 className="mr-2 h-4 w-4" />
          <span>Switch Artist</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setOpenPrivacy(true)}
          className="cursor-pointer"
        >
          <LuShield className="mr-2 h-4 w-4" />
          <span>Privacy</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setOpenSettings(true)}
          className="cursor-pointer"
        >
          <LuWrench className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer" asChild>
          <a href="https://discord.gg/A72VRX8FgK" target="_blank">
            <TbBrandDiscord className="mr-2 h-4 w-4" />
            <span>Discord</span>
          </a>
        </DropdownMenuItem>

        {profile.isObjektEditor && (
          <div className="contents">
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link href="/admin">
                <LuShieldAlert className="mr-2 h-4 w-4" />
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
          <LuLogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
