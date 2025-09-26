import ProgressObjekt from "./progress-objekt";
import type { ObjektProgression } from "@/lib/universal/progress";

type Props = {
  title: string;
  collections: ObjektProgression[];
};

export default function ProgressObjektGrid({ title, collections }: Props) {
  const sorted = [...collections]
    .sort((a, b) =>
      a.collection.collectionNo.localeCompare(b.collection.collectionNo),
    )
    .filter((c) => !(c.unobtainable && !c.obtained));

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xl font-cosmo uppercase">{title} Class</h3>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {sorted.map((collection) => (
          <ProgressObjekt
            key={collection.collection.collectionNo}
            objekt={collection}
          />
        ))}
      </div>
    </div>
  );
}
