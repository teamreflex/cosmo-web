import type { BFFCollectionGroup } from "@apollo/cosmo/types/objekts";
import GroupedObjekt from "../../objekt/objekt-collection-group";

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
