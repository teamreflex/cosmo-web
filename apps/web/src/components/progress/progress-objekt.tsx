import { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektProgression } from "@/lib/universal/progress";
import { cn } from "@/lib/utils";
import { IconStar } from "@tabler/icons-react";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";

type Props = {
  objekt: ObjektProgression;
};

export default function ProgressObjekt({ objekt }: Props) {
  const collection = Objekt.fromIndexer(objekt.collection);

  return (
    <ExpandableObjekt
      collection={collection}
      className={cn(
        "rounded-md md:rounded-lg lg:rounded-lg",
        objekt.obtained === false && "opacity-50",
      )}
    >
      {objekt.unobtainable && (
        <div className="absolute top-1 left-1 rounded-full bg-black p-1 sm:top-2 sm:left-2">
          <IconStar className="size-4 fill-white text-white" />
        </div>
      )}
      <ObjektSidebar collection={collection} />
    </ExpandableObjekt>
  );
}
