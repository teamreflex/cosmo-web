import { ObjektProgression } from "@/lib/universal/progress";
import { ObjektSidebar } from "../objekt/common";
import { Star } from "lucide-react";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { ValidArtist } from "@/lib/universal/cosmo/common";

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
        objekt.obtained === false && "opacity-50"
      )}
    >
      {objekt.unobtainable && (
        <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black rounded-full p-1">
          <Star className="size-4 fill-white text-white" />
        </div>
      )}
      <ObjektSidebar
        collection={objekt.collection.collectionNo}
        artist={objekt.collection.artist as ValidArtist}
        member={objekt.collection.member}
      />
    </ExpandableObjekt>
  );
}
