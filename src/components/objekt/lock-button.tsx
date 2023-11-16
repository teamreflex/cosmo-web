"use client";

import { toggleObjektLock } from "../collection/actions";
import { OwnedObjekt } from "@/lib/universal/cosmo";
import { trackEvent } from "fathom-client";
import { Loader2, Lock, Unlock } from "lucide-react";
import { useTransition } from "react";

type Props = {
  objekt: OwnedObjekt;
  isLocked: boolean;
  onLockChange: (tokenId: number) => void;
};

export default function LockObjekt({ objekt, isLocked, onLockChange }: Props) {
  const [isPending, startTransition] = useTransition();

  const tokenId = parseInt(objekt.tokenId);

  function toggle() {
    startTransition(async () => {
      const result = await toggleObjektLock({ tokenId, lock: !isLocked });
      if (result.success && result.data === true) {
        trackEvent(`${isLocked ? "unlock" : "lock"}-objekt`);
        onLockChange(tokenId);
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
}
