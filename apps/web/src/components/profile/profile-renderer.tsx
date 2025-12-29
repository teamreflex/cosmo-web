import { useFilters } from "@/hooks/use-filters";
import { useGridColumns } from "@/hooks/use-grid-columns";
import { useUserState } from "@/hooks/use-user-state";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { Addresses, isEqual } from "@apollo/util";
import Blockchain from "../collection/data-sources/blockchain";
import BlockchainGroups from "../collection/data-sources/blockchain-groups";
import CollectionFilters from "../collection/filter-contexts/collection-filters";
import FiltersContainer from "../collection/filters-container";
import CosmoMemberFilter from "../objekt/cosmo-member-filter";
import Portal from "../portal";
import HelpDialog from "./help-dialog";

type Props = {
  targetCosmo: PublicCosmo;
};

export default function ProfileRenderer({ targetCosmo }: Props) {
  const { user } = useUserState();
  const gridColumns = useGridColumns();

  const { showLocked, setShowLocked, dataSource, setDataSource } = useFilters({
    dataSource: isEqual(targetCosmo.address, Addresses.SPIN)
      ? "blockchain"
      : user?.collectionMode,
  });

  return (
    <div className="relative flex flex-col">
      <Portal to="#help">
        <HelpDialog />
      </Portal>

      <FiltersContainer isPortaled>
        <CollectionFilters
          dataSource={dataSource}
          setDataSource={setDataSource}
          showLocked={showLocked}
          setShowLocked={setShowLocked}
        />
      </FiltersContainer>

      <CosmoMemberFilter />

      {/* display */}
      {(() => {
        switch (dataSource) {
          case "blockchain":
            return (
              <Blockchain
                gridColumns={gridColumns}
                targetCosmo={targetCosmo}
                showLocked={showLocked}
              />
            );
          case "blockchain-groups":
            return (
              <BlockchainGroups
                gridColumns={gridColumns}
                targetCosmo={targetCosmo}
                showLocked={showLocked}
              />
            );
          default:
            return null;
        }
      })()}
    </div>
  );
}
