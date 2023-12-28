"use client";

import { cn } from "@/lib/utils";
import { useContext } from "react";
import { ObjektContext } from "../objekt/context";
import { IndexedObjekt, ObjektList } from "@/lib/universal/objekts";
import AddToList from "../lists/add-to-list";
import OverlayStatus from "../objekt/overlay-status";
import Link from "next/link";
import { ImageDown } from "lucide-react";

type Props = {
  lists: ObjektList[];
};

const classes = [
  "absolute left-0 p-1 sm:p-2 items-center group h-5 sm:h-9 transition-all overflow-hidden",
  "text-[var(--objekt-text-color)] bg-[var(--objekt-background-color)]",
  "grid grid-flow-col grid-cols-[1fr_min-content]",
];

export function TopOverlay({ lists }: Props) {
  const { objekt } = useContext(ObjektContext) as ObjektContext<IndexedObjekt>;

  return (
    <div className={cn(...classes, "top-0 rounded-br-lg sm:rounded-br-xl")}>
      {/* buttons */}
      <div className="flex items-center gap-2">
        {/* add to list */}
        <AddToList collection={objekt} lists={lists} />
      </div>

      {/* status text */}
      <div className="text-xs whitespace-nowrap max-w-0 group-hover:max-w-[12rem] overflow-hidden transition-all">
        <OverlayStatus>Add to List</OverlayStatus>
      </div>
    </div>
  );
}

export function BottomOverlay() {
  const { objekt } = useContext(ObjektContext) as ObjektContext<IndexedObjekt>;

  return (
    <div className={cn(...classes, "bottom-0 rounded-tr-lg sm:rounded-tr-xl")}>
      {/* buttons */}
      <div className="flex items-center gap-2">
        {/* view image */}
        <Link href={objekt.frontImage} target="_blank">
          <ImageDown className="h-3 w-3 sm:h-5 sm:w-5 hover:scale-110 transition-all" />
        </Link>
      </div>

      {/* status text */}
      <div className="text-xs whitespace-nowrap max-w-0 group-hover:max-w-[12rem] overflow-hidden transition-all">
        <OverlayStatus>Download Image</OverlayStatus>
      </div>
    </div>
  );
}
