"use client";

import { pinObjekt, unpinObjekt } from "@/components/collection/actions";
import { Loader2, Pin, PinOff } from "lucide-react";
import { memo, useTransition } from "react";
import { track } from "@/lib/utils";
import { useProfileContext } from "@/hooks/use-profile";
import { toast } from "@/components/ui/use-toast";

type Props = {
  collectionId: string;
  tokenId: number;
  isPinned: boolean;
};

export default memo(function PinObjekt({
  collectionId,
  tokenId,
  isPinned,
}: Props) {
  const addPin = useProfileContext((ctx) => ctx.addPin);
  const removePin = useProfileContext((ctx) => ctx.removePin);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      // unpin if already pinned
      if (isPinned) {
        const result = await unpinObjekt(tokenId);
        if (result.status === "success" && result.data === true) {
          track("unpin-objekt");
          removePin(tokenId);
          toast({
            description: `Unpinned ${collectionId}`,
          });
        }
      } else {
        // pin if not pinned
        const result = await pinObjekt(tokenId);
        if (result.status === "success") {
          track("pin-objekt");
          addPin(result.data);
          toast({
            description: `Pinned ${collectionId}`,
          });
        }
      }
    });
  }

  return (
    <button
      className="hover:cursor-pointer hover:scale-110 transition-all flex items-center"
      disabled={isPending}
      aria-label={`${isPinned ? "unpin" : "pin"} ${collectionId}`}
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
