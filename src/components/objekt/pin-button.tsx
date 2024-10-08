"use client";

import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";
import { pinObjekt, unpinObjekt } from "../collection/actions";
import { Loader2, Pin, PinOff } from "lucide-react";
import { memo, useTransition } from "react";
import { track } from "@/lib/utils";
import { useProfileContext } from "@/hooks/use-profile";
import { toast } from "../ui/use-toast";

type Props = {
  objekt: OwnedObjekt;
  isPinned: boolean;
};

export default memo(function PinObjekt({ objekt, isPinned }: Props) {
  const addPin = useProfileContext((ctx) => ctx.addPin);
  const removePin = useProfileContext((ctx) => ctx.removePin);
  const [isPending, startTransition] = useTransition();

  const tokenId = parseInt(objekt.tokenId);

  function toggle() {
    startTransition(async () => {
      // unpin if already pinned
      if (isPinned) {
        const result = await unpinObjekt(tokenId);
        if (result.status === "success" && result.data === true) {
          track("unpin-objekt");
          removePin(tokenId);
          toast({
            description: `Unpinned ${objekt.collectionId}`,
          });
        }
      } else {
        // pin if not pinned
        const result = await pinObjekt(tokenId);
        if (result.status === "success") {
          track("pin-objekt");
          addPin(result.data);
          toast({
            description: `Pinned ${objekt.collectionId}`,
          });
        }
      }
    });
  }

  return (
    <button
      className="hover:cursor-pointer hover:scale-110 transition-all flex items-center"
      disabled={isPending}
      aria-label={`${isPinned ? "unpin" : "pin"} ${objekt.collectionId}`}
      onClick={toggle}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 sm:h-5 sm:w-5 animate-spin" />
      ) : isPinned ? (
        <PinOff className="h-3 w-3 sm:h-5 sm:w-5" />
      ) : (
        <Pin className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
});
