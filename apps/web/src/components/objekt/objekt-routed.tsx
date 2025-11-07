import MetadataDialog from "./metadata-dialog";

type Props = {
  slug: string;
  isActive: boolean;
  setActive: (slug: string | undefined) => void;
};

/**
 * Provides a pre-opened MetadataDialog for the index when routing to an objekt slug.
 */
export default function RoutedExpandableObjekt({
  slug,
  isActive,
  setActive,
}: Props) {
  return (
    <MetadataDialog
      slug={slug}
      isActive={isActive}
      onClose={() => setActive(undefined)}
    />
  );
}
