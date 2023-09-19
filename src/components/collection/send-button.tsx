"use client";

import { OwnedObjekt } from "@/lib/server/cosmo";
import { cn } from "@/lib/utils";
import { MailX, Send } from "lucide-react";

type Props = {
  objekt: OwnedObjekt;
};

export default function SendObjekt({ objekt }: Props) {
  return (
    <div
      className={cn(
        objekt.transferable &&
          "hover:cursor-pointer hover:scale-110 transition-all"
      )}
    >
      {!objekt.transferable && <MailX className="h-5 w-5" />}
      {objekt.transferable && <Send className="h-5 w-5" />}
    </div>
  );
}
