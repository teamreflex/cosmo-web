import MetadataDialog from "./metadata-dialog";

type Props = {
  slug: string;
  setActive: (slug: string | null) => void;
};

/**
 * Provides a pre-opened MetadataDialog for the index when routing to an objekt slug.
 */
export default function RoutedExpandableObjekt({ slug, setActive }: Props) {
  return (
    <MetadataDialog
      slug={slug}
      isActive={true}
      onClose={() => setActive(null)}
    />
  );
}
