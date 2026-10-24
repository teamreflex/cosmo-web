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
    () =>
      new Set(
        pins.flatMap((pin) =>
          pin.kind === "objekt" ? [Number(pin.objekt.tokenId)] : [],
        ),
      ),
    [pins],
  );
  const lockedSet = useMemo(() => new Set(lockedObjekts), [lockedObjekts]);

  return (
    /**
     * --objekt-width shrinks the card on short viewports to leave room for the
     * serial list, and the desktop card column is sized around it.
     */
    <div
      className="grid min-h-0 flex-1 [--objekt-width:min(220px,calc(40dvh*(var(--aspect-photocard))))] data-[desktop=false]:grid-cols-1 data-[desktop=false]:grid-rows-[auto_1fr] data-[desktop=true]:grid-cols-[calc(var(--objekt-width)+6rem)_1fr] data-[desktop=true]:overflow-hidden sm:[--objekt-width:min(280px,calc(50dvh*(var(--aspect-photocard))))]"
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
