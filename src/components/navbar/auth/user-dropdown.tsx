import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TokenPayload } from "@/lib/universal/auth";
import { Cog, Disc3, LogOut, Shield } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import SwitchArtistDialog from "./switch-artist-dialog";
import { CosmoArtist } from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import PrivacyDialog from "./privacy-dialog";
import SettingsDialog from "./settings-dialog";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { usePathname } from "next/navigation";

type UserDropdownProps = {
  token: TokenPayload;
  profile: PublicProfile;
  artists: CosmoArtist[];
  selectedArtist: ValidArtist;
  comoBalances: ReactNode;
  onSignOut: () => void;
  cosmoAvatar: ReactNode;
};

export default function UserDropdown({
  token,
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
  const [openDropdown, setOpenDropdown] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpenDropdown(false);
  }, [pathname]);

  return (
    <>
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

      <DropdownMenu open={openDropdown} onOpenChange={setOpenDropdown}>
        <DropdownMenuTrigger className="group outline-none">
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
            <Disc3 className="mr-2 h-4 w-4" />
            <span>Switch Artist</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setOpenPrivacy(true)}
            className="cursor-pointer"
          >
            <Shield className="mr-2 h-4 w-4" />
            <span>Privacy</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setOpenSettings(true)}
            className="cursor-pointer"
          >
            <Cog className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onSignOut()}
            className="cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
