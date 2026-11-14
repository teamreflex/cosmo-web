import { useActiveObjekt } from "@/hooks/use-active-objekt";
import { useObjektSerial } from "@/hooks/use-objekt-serial";
import { useState } from "react";
import MetadataSheet from "./metadata-sheet";

/**
 * The index's objekt sheet, opened by the `?id` search param. It stays mounted
 * so opening animates, and keeps showing the last objekt while it slides away.
 */
export default function RoutedExpandableObjekt() {
  const { activeObjekt, setActiveObjekt } = useActiveObjekt();
  const { reset } = useObjektSerial();
  const [slug, setSlug] = useState(activeObjekt);
  if (activeObjekt !== undefined && activeObjekt !== slug) {
    setSlug(activeObjekt);
  }

  return (
    <MetadataSheet
      slug={slug}
      open={activeObjekt !== undefined}
      onOpenChange={(open) => {
        if (open === false) {
          reset();
          setActiveObjekt(undefined);
        }
      }}
    />
  );
}
