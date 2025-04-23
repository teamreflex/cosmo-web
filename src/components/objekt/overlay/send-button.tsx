"use client";

import { Send } from "lucide-react";
import { useObjektTransfer } from "@/hooks/use-objekt-transfer";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { useCosmoArtists } from "@/hooks/use-cosmo-artist";
import { toast } from "@/components/ui/use-toast";

type Props = {
  collection: Objekt.Collection;
  token: Objekt.Token;
};

export default function SendObjekt({ collection, token }: Props) {
  const select = useObjektTransfer((ctx) => ctx.select);
  const { getArtist } = useCosmoArtists();

  function handleClick() {
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
      className="hover:scale-110 transition-all flex items-center"
    >
      <Send className="h-3 w-3 sm:h-5 sm:w-5" />
    </button>
  );
}
