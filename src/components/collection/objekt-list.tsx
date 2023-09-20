"use client";

import { OwnedObjekt } from "@/lib/server/cosmo";
import Objekt from "./objekt";

type Props = {
  objekts: OwnedObjekt[];
};

export default function ObjektList({ objekts }: Props) {
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
