"use client";

import { CosmoArtist } from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setArtistCookie } from "./actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TbLoader2 } from "react-icons/tb";
import { toast } from "@/components/ui/use-toast";

type Props = {
  artists: CosmoArtist[];
  selectedArtist: ValidArtist;
};

export default function GuestArtistSwitch({ artists, selectedArtist }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const currentArtist = artists.find(
    (a) => a.name.toLowerCase() === selectedArtist.toLowerCase()
  );

  function select(artist: CosmoArtist) {
    startTransition(async () => {
      const result = await setArtistCookie(artist.name);
      if (result) {
        toast({
          description: `Switched to ${artist.title}`,
        });
        router.refresh();
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group outline-hidden">
        <Avatar className="ring-2 ring-white/30 group-data-[state=open]:ring-cosmo transition-colors">
          <AvatarFallback>
            {currentArtist?.title.charAt(0).toUpperCase()}
          </AvatarFallback>
          <AvatarImage
            src={currentArtist?.logoImageUrl}
            alt={currentArtist?.title}
          />
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Select Artist</DropdownMenuLabel>
        {artists.map((artist) => (
          <DropdownMenuItem
            key={artist.name}
            onClick={() => select(artist)}
            className="gap-2 cursor-pointer"
          >
            {isPending ? (
              <TbLoader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Avatar className="h-5 w-5">
                <AvatarFallback>
                  {artist.title.charAt(0).toUpperCase()}
                </AvatarFallback>
                <AvatarImage src={artist.logoImageUrl} alt={artist.title} />
              </Avatar>
            )}

            <span>{artist.title}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
