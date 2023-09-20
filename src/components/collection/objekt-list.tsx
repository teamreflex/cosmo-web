"use client";

import { OwnedObjekt } from "@/lib/server/cosmo";
import Objekt from "./objekt";
import { useAuthStore } from "@/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Props = {
  objekts: OwnedObjekt[];
};

export default function ObjektList({ objekts }: Props) {
  const ramperUser = useAuthStore((state) => state.ramperUser);
  const router = useRouter();

  useEffect(() => {
    if (!ramperUser) {
      router.push("/home");
    }
  }, [ramperUser, router]);

  return (
    <div className="grid grid-cols-4 gap-4">
      {objekts.map((objekt) => (
        <div key={objekt.tokenId}>
          <Objekt objekt={objekt} showButtons={true} />
        </div>
      ))}
    </div>
  );
}
