"use client";

import { IndexedObjekt, ObjektList } from "@/lib/universal/objekt-index";
import { ListPlus } from "lucide-react";
import { useTransition } from "react";

type Props = {
  objekt: IndexedObjekt;
  lists: ObjektList[];
};

export default function AddToList({ objekt, lists }: Props) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      console.log("addToList");
    });
  }

  return (
    <button
      className="hover:cursor-pointer hover:scale-110 transition-all flex items-center"
      disabled={isPending}
      aria-label="Add to list"
      onClick={toggle}
    >
      <ListPlus className="h-3 w-3 sm:h-5 sm:w-5" />
    </button>
  );
}
