import { ObjektSidebar } from "@/components/objekt/common";
import FlippableObjekt from "@/components/objekt/objekt-flippable";
import { Button } from "@/components/ui/button";
import {
  SpinStateCreated,
  useObjektSpin,
  useSpinSubmit,
} from "@/hooks/use-objekt-spin";
import { Loader2 } from "lucide-react";

type Props = {
  state: SpinStateCreated;
};

/**
 * Spin has been created, send the objekt.
 */
export default function StateCreated({ state }: Props) {
  const { handleSend, isPending } = useSpinSubmit();
  const cancel = useObjektSpin((state) => state.cancelSending);

  function handleClick() {
    handleSend(state);
  }

  return (
    <div className="flex flex-col gap-4 items-center justify-center w-full">
      <div className="w-2/3 md:w-48 mx-auto">
        <FlippableObjekt collection={state.objekt.collection}>
          <ObjektSidebar
            collection={state.objekt.collection.collectionNo}
            serial={state.objekt.token.serial}
          />
        </FlippableObjekt>
      </div>

      <div className="flex flex-col items-center">
        <h3 className="text-lg font-bold">
          Are you sure you want to spin this objekt?
        </h3>
        <p className="text-sm text-muted-foreground">
          This action cannot be undone.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={cancel}
          className="w-fit"
          disabled={isPending}
        >
          <span>Cancel</span>
        </Button>

        <Button onClick={handleClick} className="w-fit" disabled={isPending}>
          <span>Send Objekt</span>
          {isPending && <Loader2 className="ml-2 w-4 h-4 animate-spin" />}
        </Button>
      </div>
    </div>
  );
}
