import { Send } from "lucide-react";
import { toast } from "sonner";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { useObjektTransfer } from "@/hooks/use-objekt-transfer";
import { useArtists } from "@/hooks/use-artists";
import { m } from "@/i18n/messages";

type Props = {
  collection: Objekt.Collection;
  token: Objekt.Token;
};

export default function SendObjekt({ collection, token }: Props) {
  const select = useObjektTransfer((ctx) => ctx.select);
  const { getArtist } = useArtists();

  function handleClick() {
    const artist = getArtist(collection.artist);
    if (!artist) {
      toast.error(m.toast_artist_not_found());
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
      className="flex items-center transition-all hover:scale-110"
    >
      <Send className="h-3 w-3 sm:h-5 sm:w-5" />
    </button>
  );
}
