"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ExternalLink, Maximize2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { useCosmoArtists } from "@/hooks/use-cosmo-artist";
import { useObjektOverlay } from "@/store";

type Props = {
  collection: Objekt.Collection;
  token: Objekt.Token;
};

export default function InformationOverlay({ collection, token }: Props) {
  const [open, setOpen] = useState(false);
  const { getArtist } = useCosmoArtists();
  const isHidden = useObjektOverlay((state) => state.isHidden);

  const contract = getArtist(collection.artist)?.contracts.Objekt;
  const formatted = format(Date.parse(token.acquiredAt), "dd/MM/yy h:mmaa");
  const opensea = new URL(
    `https://opensea.io/assets/matic/${contract}/${token.tokenId}`
  );

  return (
    <div
      data-open={open}
      className={cn(
        "absolute isolate bottom-0 left-0 p-1 sm:p-2 rounded-tr-lg sm:rounded-tr-xl flex gap-2 group h-5 sm:h-9 w-5 sm:w-9 transition-all overflow-hidden",
        "text-(--objekt-text-color) bg-(--objekt-background-color)",
        "data-[open=true]:w-20 sm:data-[open=true]:w-32 data-[open=true]:h-32 sm:data-[open=true]:h-32",
        isHidden && "hidden"
      )}
    >
      <button
        className="z-50 hover:cursor-pointer hover:scale-110 transition-all flex items-center place-self-end"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Maximize2 className="h-3 w-3 sm:h-5 sm:w-5" />
      </button>

      <div className="z-40 absolute flex flex-col gap-1 group-data-[open=false]:opacity-0 group-data-[open=true]:opacity-100 transition-all">
        <div className="flex flex-col text-xs">
          <Link
            className={cn(
              "font-semibold flex gap-1 items-center underline",
              !open && "pointer-events-none"
            )}
            target="_blank"
            href={opensea}
          >
            <span>OpenSea</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="flex flex-col text-xs">
          <span className="font-semibold">Token ID</span>
          <span>{token.tokenId}</span>
        </div>

        <div className="flex flex-col text-xs">
          <span className="font-semibold">Received</span>
          <span>{formatted}</span>
        </div>
      </div>
    </div>
  );
}
