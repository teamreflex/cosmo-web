"use client";

import { toggleObjektLock } from "@/app/(core)/collection/actions";
import { OwnedObjekt } from "@/lib/server/cosmo";
import { trackEvent } from "fathom-client";
import { Loader2, Lock, Unlock } from "lucide-react";
import { useFormStatus } from "react-dom";

type Props = {
  objekt: OwnedObjekt;
  isLocked: boolean;
  onLockChange: (tokenId: number) => void;
};

export default function LockObjekt({ objekt, isLocked, onLockChange }: Props) {
  async function toggle(form: FormData) {
    const result = await toggleObjektLock(form);
    if (result.success) {
      trackEvent(`${isLocked ? "unlock" : "lock"}-objekt`);
      onLockChange(parseInt(objekt.tokenId));
    }
  }

  return (
    <>
      <form action={toggle}>
        <input type="hidden" name="tokenId" value={objekt.tokenId} />
        <input type="hidden" name="lock" value={(!isLocked).toString()} />

        <LockButton isLocked={isLocked} />
      </form>
    </>
  );
}

function LockButton({ isLocked }: { isLocked: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="hover:cursor-pointer hover:scale-110 transition-all flex items-center"
      disabled={pending}
      aria-label={`${isLocked ? "unlock" : "lock"} this objekt`}
      type="submit"
    >
      {pending ? (
        <Loader2 className="h-3 w-3 sm:h-5 sm:w-5 animate-spin" />
      ) : isLocked ? (
        <Lock className="h-3 w-3 sm:h-5 sm:w-5" />
      ) : (
        <Unlock className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}
