"use client";

import { Send } from "lucide-react";
import { useObjektTransfer } from "@/hooks/use-objekt-transfer";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { useCosmoArtists } from "@/hooks/use-cosmo-artist";
import { toast } from "@/components/ui/use-toast";
import { DISABLE_CHAIN } from "@/lib/utils";

type Props = {
  collection: Objekt.Collection;
  token: Objekt.Token;
};

export default function SendObjekt({ collection, token }: Props) {
  const select = useObjektTransfer((ctx) => ctx.select);
  const { getArtist } = useCosmoArtists();

  function handleClick() {
    if (DISABLE_CHAIN) {
      toast({
        description: "Objekt sending is currently disabled.",
        variant: "destructive",
      });
      return;
    }

    const artist = getArtist(collection.artist);
    if (!artist) {
      toast({
        description: "Artist not found",
        variant: "destructive",
      });
      return;
    }

    select({
      tokenId: token.tokenId,
      contract: artist.contracts.Objekt,
      collectionId: collection.collectionId,
      collectionNo: collection.collectionNo,
      serial: token.serial,
      thumbnailImage: collection.frontImage,
    });
  }

  return (
    <button
      onClick={handleClick}
      className="hover:cursor-pointer hover:scale-110 transition-all flex items-center"
    >
      <Send className="h-3 w-3 sm:h-5 sm:w-5" />
    </button>
  );
}
