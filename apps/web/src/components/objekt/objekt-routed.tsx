import MetadataDialog from "./metadata-dialog";
import { useActiveObjekt } from "@/hooks/use-active-objekt";

/**
 * Provides a pre-opened MetadataDialog for the index when routing to an objekt slug.
 */
export default function RoutedExpandableObjekt() {
  const { activeObjekt, setActiveObjekt } = useActiveObjekt();

  // wait for the dialog to close before resetting the active objekt
  function onClose() {
    setTimeout(() => {
      setActiveObjekt(undefined);
    }, 200);
  }

  if (activeObjekt === undefined) {
    return null;
  }

  return (
    <MetadataDialog slug={activeObjekt} defaultOpen={true} onClose={onClose} />
  );
}
