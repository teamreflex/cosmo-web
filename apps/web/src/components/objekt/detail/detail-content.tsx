import { useAuthenticated } from "@/hooks/use-authenticated";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useProfileContext } from "@/hooks/use-profile";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { useMemo } from "react";
import { ObjektGradient, ObjektSidebar } from "../common";
import FlippableObjekt from "../objekt-flippable";
import SerialTicketList from "./serial-ticket-list";

type Props = {
  collection: Objekt.Collection;
  tokens: Objekt.Token[];
};

export default function DetailContent({ collection, tokens }: Props) {
  const authenticated = useAuthenticated();
  const isDesktop = useMediaQuery();
  const pins = useProfileContext((ctx) => ctx.pins);
  const lockedObjekts = useProfileContext((ctx) => ctx.lockedObjekts);

  const pinSet = useMemo(
    () => new Set(pins.map((p) => Number(p.tokenId))),
    [pins],
  );
  const lockedSet = useMemo(() => new Set(lockedObjekts), [lockedObjekts]);

  return (
    <div
      className="grid min-h-0 flex-1 data-[desktop=false]:grid-cols-1 data-[desktop=false]:grid-rows-[auto_1fr] data-[desktop=true]:grid-cols-[minmax(280px,380px)_1fr] data-[desktop=true]:overflow-hidden"
      data-desktop={isDesktop}
    >
      <ObjektGradient
        collection={collection}
        className="flex flex-col items-center justify-center gap-4 border-border p-4 data-[desktop=false]:-mt-10 data-[desktop=false]:border-b data-[desktop=false]:pt-14 data-[desktop=true]:border-r data-[desktop=true]:p-6"
        data-desktop={isDesktop}
      >
        <div className="w-full max-w-[220px] sm:max-w-[280px]">
          <FlippableObjekt collection={collection}>
            <ObjektSidebar collection={collection} />
          </FlippableObjekt>
        </div>
        <div className="hidden text-center sm:block">
          <div className="font-cosmo text-xl leading-none font-black tracking-[0.02em] uppercase">
            {collection.member}
          </div>
          <div className="mt-1 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            {collection.artist} · {collection.season} · {collection.class}
          </div>
        </div>
      </ObjektGradient>

      <SerialTicketList
        collection={collection}
        tokens={tokens}
        authenticated={authenticated}
        pins={pinSet}
        locked={lockedSet}
      />
    </div>
  );
}
