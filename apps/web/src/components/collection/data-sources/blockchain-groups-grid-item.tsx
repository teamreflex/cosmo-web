import GroupedObjekt from "../../objekt/objekt-collection-group";
import type { BFFCollectionGroup } from "@apollo/cosmo/types/objekts";

type Props = {
  item: BFFCollectionGroup;
  id: string;
  priority: boolean;
  gridColumns: number;
  showLocked: boolean;
};

export function BlockchainGroupsGridItem({
  item,
  priority,
  gridColumns,
  showLocked,
}: Props) {
  return (
    <GroupedObjekt
      group={item}
      gridColumns={gridColumns}
      showLocked={showLocked}
      priority={priority}
    />
  );
}
