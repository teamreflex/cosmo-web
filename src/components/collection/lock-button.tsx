"use client";

import { setObjektLock } from "@/app/(core)/collection/actions";
import { OwnedObjekt } from "@/lib/server/cosmo";
import { Loader2, Lock, Unlock } from "lucide-react";
import { useEffect, useState } from "react";
import { experimental_useFormStatus as useFormStatus } from "react-dom";

type Props = {
  objekt: OwnedObjekt;
  locked: boolean;
  onLockChange: (locked: boolean) => void;
};

export default function LockObjekt({ objekt, locked, onLockChange }: Props) {
  async function toggle(form: FormData) {
    const newLockState = !locked;
    const result = await setObjektLock(form);
    if (result.success) {
      onLockChange(newLockState);
    }
  }

  return (
    <>
      <form action={toggle}>
        <input type="hidden" name="tokenId" value={objekt.tokenId} />
        <input type="hidden" name="lock" value={(!locked).toString()} />

        <LockButton locked={locked} />
      </form>
    </>
  );
}

function LockButton({ locked }: { locked: boolean }) {
  const { pending } = useFormStatus();

  useEffect(() => {
    console.log(pending);
  }, [pending]);

  return (
    <button
      className="hover:cursor-pointer hover:scale-110 transition-all flex items-center"
      disabled={pending}
      aria-label={`${locked ? "unlock" : "lock"} this objekt`}
      type="submit"
    >
      {pending ? (
        <Loader2 className="h-3 w-3 sm:h-5 sm:w-5 animate-spin" />
      ) : locked ? (
        <Lock className="h-3 w-3 sm:h-5 sm:w-5" />
      ) : (
        <Unlock className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}
