import { ObjektSidebar } from "@/components/objekt/common";
import FlippableObjekt from "@/components/objekt/objekt-flippable";
import { Button } from "@/components/ui/button";
import {
  SpinStateSelected,
  useObjektSpin,
  useSpinPresign,
} from "@/hooks/use-objekt-spin";
import { CosmoSeason } from "@/lib/universal/cosmo/season";
import { Loader2, X } from "lucide-react";

type Props = {
  seasons: CosmoSeason[];
  state: SpinStateSelected;
};

/**
 * Confirm the current selection before sending.
 */
export default function StateSelected({ seasons, state }: Props) {
  const resetSelection = useObjektSpin((state) => state.resetSelection);
  const { mutate, status } = useSpinPresign();

  const season = seasons.find(
    (s) => s.title === state.objekt.collection.season
  );

  return (
    <div className="flex flex-col gap-4 items-center justify-center w-full">
      <div className="w-2/3 md:w-48 mx-auto">
        <FlippableObjekt collection={state.objekt.collection}>
          <ObjektSidebar
            collection={state.objekt.collection.collectionNo}
            serial={state.objekt.token.serial}
          />

          <div className="absolute top-2 left-2">
            <button
              onClick={resetSelection}
              disabled={status === "pending"}
              className="cursor-pointer aspect-square rounded-full bg-black/80 size-7"
            >
              <X className="m-auto size-6" />
            </button>
          </div>
        </FlippableObjekt>
      </div>

      <span
        style={{
          "--season-color": season?.primaryColor ?? "#000",
        }}
        className="text-sm rounded-lg px-2 py-1 bg-(--season-color)/25 text-(--season-color)"
      >
        {season?.title}
      </span>

      <h3 className="text-lg font-bold">
        Spin with the {season?.title} objekt
      </h3>

      <Button
        onClick={() => mutate(state.objekt.token.tokenId)}
        className="w-fit"
        disabled={status === "pending"}
      >
        <span>Start Spin</span>
        {status === "pending" && (
          <Loader2 className="ml-2 w-4 h-4 animate-spin" />
        )}
      </Button>
    </div>
  );
}
