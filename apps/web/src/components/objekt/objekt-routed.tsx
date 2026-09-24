import { useActiveObjekt } from "@/hooks/use-active-objekt";
import { useState } from "react";
import MetadataDialog from "./metadata-dialog";

/**
 * The index's objekt sheet, opened by the `?id` search param. It stays mounted
 * so opening animates, and keeps showing the last objekt while it slides away.
 */
export default function RoutedExpandableObjekt() {
  const { activeObjekt, setActiveObjekt } = useActiveObjekt();
  const [slug, setSlug] = useState(activeObjekt);
  if (activeObjekt !== undefined && activeObjekt !== slug) {
    setSlug(activeObjekt);
  }

  return (
    <MetadataDialog
      slug={slug}
      open={activeObjekt !== undefined}
      onClose={() => setActiveObjekt(undefined)}
    />
  );
}
