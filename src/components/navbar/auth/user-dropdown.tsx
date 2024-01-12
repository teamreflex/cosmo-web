import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TokenPayload } from "@/lib/universal/auth";
import { Cog, Disc3, LogOut, Shield, User } from "lucide-react";
import Link from "next/link";
import { ReactNode, useState } from "react";
import SwitchArtistDialog from "./switch-artist-dialog";
import { CosmoArtist } from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import PrivacyDialog from "./privacy-dialog";
import SettingsDialog from "./settings-dialog";
import { PublicProfile } from "@/lib/universal/cosmo/auth";

type UserDropdownProps = {
  user: TokenPayload;
  profile: PublicProfile;
  artists: CosmoArtist[];
  selectedArtist: ValidArtist | undefined;
  comoBalances: ReactNode;
  onSignOut: () => void;
};

export default function UserDropdown({
  user,
  profile,
  artists,
  selectedArtist,
  comoBalances,
  onSignOut,
}: UserDropdownProps) {
  const [openArtistSwitch, setOpenArtistSwitch] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  const artist = artists.find((artist) => artist.name === selectedArtist);

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

      <DropdownMenu>
        <DropdownMenuTrigger className="group outline-none">
          <Avatar className="ring-2 ring-white/30 group-data-[state=open]:ring-cosmo transition-colors">
            <AvatarFallback>
              {user.nickname.charAt(0).toUpperCase()}
            </AvatarFallback>
            <AvatarImage src={artist?.logoImageUrl} alt={artist?.title} />
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem className="md:hidden flex gap-2 items-center">
            {comoBalances}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="md:hidden" />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <Link href="/my">My Page</Link>
          </DropdownMenuItem>

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
