import { OwnedObjekt } from "@/lib/server/cosmo";
import { cn } from "@/lib/utils";
import Image from "next/image";
import LockObjekt from "./lock-button";
import SendObjekt from "./send-button";

type Props = {
  objekt: OwnedObjekt;
};

function pad(n: string) {
  n = n + "";
  return n.length >= 5 ? n : new Array(5 - n.length + 1).join("0") + n;
}

export default function Objekt({ objekt }: Props) {
  return (
    <div className="relative touch-manipulation">
      <Image
        src={objekt.frontImage}
        width={291}
        height={450}
        alt={objekt.collectionId}
      />
      <ObjektNumber objekt={objekt} />
      <div
        className="absolute top-0 left-0 p-2 rounded-tl-2xl rounded-br-xl flex gap-2 items-center group shadow-md"
        style={{
          backgroundColor: objekt.backgroundColor,
          color: objekt.textColor,
        }}
      >
        <SendObjekt objekt={objekt} />
        {objekt.transferable && <LockObjekt objekt={objekt} />}
        <p className="text-sm font-semibold hidden group-hover:flex">
          {objekt.collectionId}
        </p>
      </div>
    </div>
  );
}

function ObjektNumber({ objekt }: Props) {
  return (
    <div
      className={cn(
        "absolute h-full flex gap-2 justify-center top-0 right-1 [writing-mode:vertical-lr] font-semibold"
      )}
      style={{ color: objekt.textColor }}
    >
      <span>{objekt.collectionNo}</span>
      <span>#{pad(objekt.objektNo.toString())}</span>
    </div>
  );
}
