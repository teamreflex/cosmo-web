import { m } from "@/i18n/messages";
import type { ObjektProgression } from "@/lib/universal/progress";
import ProgressObjekt from "./progress-objekt";

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
      <h3 className="font-cosmo text-xl uppercase">
        {title} {m.common_class()}
      </h3>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
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
