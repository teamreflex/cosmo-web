"use client";

import { LuSend } from "react-icons/lu";
import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";
import { useObjektSelection } from "@/hooks/use-objekt-selection";

type Props = {
  objekt: OwnedObjekt;
};

export default function SendObjekt({ objekt }: Props) {
  const select = useObjektSelection((ctx) => ctx.select);

  return (
    <button
      onClick={() =>
        select({
          tokenId: Number(objekt.tokenId),
          contract: objekt.tokenAddress,
          collectionId: objekt.collectionId,
          collectionNo: objekt.collectionNo,
          serial: objekt.objektNo,
          thumbnailImage: objekt.thumbnailImage,
        })
      }
      className="hover:cursor-pointer hover:scale-110 transition-all flex items-center"
    >
      <LuSend className="h-3 w-3 sm:h-5 sm:w-5" />
    </button>
  );
}
