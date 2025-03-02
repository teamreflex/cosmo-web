import { ObjektSidebar } from "@/components/objekt/common";
import FlippableObjekt from "@/components/objekt/objekt-flippable";
import { Button } from "@/components/ui/button";
import {
  SpinStateSelected,
  useObjektSpin,
  useSpinPresign,
} from "@/hooks/use-objekt-spin";
import { Loader2 } from "lucide-react";

type Props = {
  state: SpinStateSelected;
};

/**
 * Confirm the current selection before sending.
 */
export default function StateSelected({ state }: Props) {
  const resetSelection = useObjektSpin((state) => state.resetSelection);
  const { mutate, status } = useSpinPresign();

  return (
    <div className="flex flex-col gap-2 items-center">
      <div className="flex gap-2 items-center">
        <Button
          variant="outline"
          onClick={resetSelection}
          className="w-fit"
          disabled={status === "pending"}
        >
          Select another objekt
        </Button>

        <Button
          onClick={() => mutate(state.objekt.token.tokenId)}
          className="w-fit"
          disabled={status === "pending"}
        >
          <span>Start Spin</span>
          {status === "pending" && <Loader2 className="w-4 h-4 animate-spin" />}
        </Button>
      </div>

      <div className="w-2/3 md:w-48 mx-auto">
        <FlippableObjekt collection={state.objekt.collection}>
          <ObjektSidebar
            collection={state.objekt.collection.collectionNo}
            serial={state.objekt.token.serial}
          />
        </FlippableObjekt>
      </div>
    </div>
  );
}
