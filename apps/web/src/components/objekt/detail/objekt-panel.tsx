import type { Objekt } from "@/lib/universal/objekt-conversion";
import { ObjektGradient, ObjektSidebar } from "../common";
import FlippableObjekt from "../objekt-flippable";

type Props = {
  collection: Objekt.Collection;
  isDesktop: boolean;
};

/**
 * Left column of the detail dialogs: the flippable objekt on its gradient with
 * the member name and collection line underneath.
 */
export default function ObjektPanel({ collection, isDesktop }: Props) {
  return (
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
      <div className="text-center">
        <div className="font-cosmo text-xl leading-none font-black tracking-[0.02em] uppercase">
          {collection.member}
        </div>
        <div className="mt-1 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          {collection.artist} · {collection.season} · {collection.collectionNo}{" "}
          · {collection.class}
        </div>
      </div>
    </ObjektGradient>
  );
}
