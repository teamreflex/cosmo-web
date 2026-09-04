import { useAuthenticated } from "@/hooks/use-authenticated";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useProfileContext } from "@/hooks/use-profile";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { useMemo } from "react";
import ObjektPanel from "./objekt-panel";
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
      <ObjektPanel collection={collection} isDesktop={isDesktop} />

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
