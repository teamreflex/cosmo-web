"use client";

import { OwnedObjekt } from "@/lib/server/cosmo";
import { Loader2, Lock, Unlock } from "lucide-react";
import { useState } from "react";

type Props = {
  objekt: OwnedObjekt;
};

export default function LockObjekt({ objekt }: Props) {
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  function toggle() {
    setLoading(true);
    setLocked(!locked);
    setTimeout(() => setLoading(false), 2000);
  }

  return (
    <button
      className="hover:cursor-pointer hover:scale-110 transition-all"
      onClick={toggle}
      disabled={loading}
      aria-label={`${locked ? "unlock" : "lock"} this objekt`}
    >
      <LockIcon loading={loading} locked={locked} />
    </button>
  );
}

function LockIcon({ loading, locked }: { loading: boolean; locked: boolean }) {
  if (loading) {
    return <Loader2 className="h-3 w-3 sm:h-5 sm:w-5 animate-spin" />;
  }

  return locked ? (
    <Lock className="h-3 w-3 sm:h-5 sm:w-5" />
  ) : (
    <Unlock className="h-3 w-3 sm:h-5 sm:w-5" />
  );
}
