import { ObjektProgression } from "@/lib/universal/progress";
import ProgressObjekt from "./progress-objekt";
import { memo } from "react";

type Props = {
  title: string;
  collections: ObjektProgression[];
};

export default memo(function ProgressObjektGrid({ title, collections }: Props) {
  const sorted = collections.toSorted(
    (a, b) => parseInt(a.collectionNo) - parseInt(b.collectionNo)
  );

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xl font-bold font-cosmo uppercase">{title} Class</h3>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {sorted.map((collection) => (
          <ProgressObjekt key={collection.collectionNo} objekt={collection} />
        ))}
      </div>
    </div>
  );
});
