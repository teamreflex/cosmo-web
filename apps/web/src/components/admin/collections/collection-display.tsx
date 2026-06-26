import { ObjektSidebar } from "@/components/objekt/common";
import { m } from "@/i18n/messages";
import { Objekt } from "@/lib/universal/objekt-conversion";
import type { UpdateCollectionInput } from "@/lib/universal/schema/collections";
import type { Collection } from "@apollo/database/indexer/types";
import { useFormContext, useWatch } from "react-hook-form";

type Props = {
  collection: Collection;
};

export default function CollectionDisplay({ collection }: Props) {
  const { control } = useFormContext<UpdateCollectionInput>();

  // live values so the rendered objekt reflects unsaved form edits
  const member = useWatch({ control, name: "member" });
  const objektClass = useWatch({ control, name: "class" });
  const collectionNo = useWatch({ control, name: "collectionNo" });
  const backgroundColor = useWatch({ control, name: "backgroundColor" });
  const textColor = useWatch({ control, name: "textColor" });
  const frontMedia = useWatch({ control, name: "frontMedia" });

  const live: Objekt.Collection = {
    ...Objekt.fromIndexer(collection),
    member,
    class: objektClass,
    collectionNo,
    backgroundColor,
    textColor,
    frontMedia,
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="@container">
        <div
          style={{
            "--objekt-background-color": live.backgroundColor,
            "--objekt-text-color": live.textColor,
          }}
          className="relative aspect-photocard overflow-hidden rounded-photocard bg-secondary"
        >
          {live.frontMedia ? (
            <video
              src={live.frontMedia}
              className="w-full"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={live.frontImage}
              alt={live.collectionId}
              width={291}
              height={450}
              className="w-full"
            />
          )}
          <ObjektSidebar collection={live} />
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">
          {m.admin_collection_field_collection_id()}
        </dt>
        <dd className="truncate font-mono">{collection.collectionId}</dd>
        <dt className="text-muted-foreground">
          {m.admin_collection_field_slug()}
        </dt>
        <dd className="truncate font-mono">{collection.slug}</dd>
      </dl>
    </div>
  );
}
