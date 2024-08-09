"use client";

import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";
import { toggleObjektLock } from "../collection/actions";
import { Loader2, Lock, Unlock } from "lucide-react";
import { memo, useTransition } from "react";
import { track } from "@/lib/utils";
import { useProfileContext } from "@/hooks/use-profile";

type Props = {
  objekt: OwnedObjekt;
  isLocked: boolean;
};

export default memo(function LockObjekt({ objekt, isLocked }: Props) {
  const toggleLock = useProfileContext((ctx) => ctx.toggleLock);
  const [isPending, startTransition] = useTransition();

  const tokenId = parseInt(objekt.tokenId);

  function toggle() {
    startTransition(async () => {
      const result = await toggleObjektLock({ tokenId, lock: !isLocked });
      if (result.status === "success" && result.data === true) {
        track(`${isLocked ? "unlock" : "lock"}-objekt`);
        toggleLock(tokenId);
      }
    });
  }

  return (
    <button
      className="hover:cursor-pointer hover:scale-110 transition-all flex items-center"
      disabled={isPending}
      aria-label={`${isLocked ? "unlock" : "lock"} this objekt`}
      onClick={toggle}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 sm:h-5 sm:w-5 animate-spin" />
      ) : isLocked ? (
        <Lock className="h-3 w-3 sm:h-5 sm:w-5" />
      ) : (
        <Unlock className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
});
