import FiltersContainer from "../collection/filters-container";
import Portal from "../portal";
import Blockchain from "../collection/data-sources/blockchain";
import BlockchainGroups from "../collection/data-sources/blockchain-groups";
import CollectionFilters from "../collection/filter-contexts/collection-filters";
import HelpDialog from "./help-dialog";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { useFilters } from "@/hooks/use-filters";
import { useGridColumns } from "@/hooks/use-grid-columns";
import { useUserState } from "@/hooks/use-user-state";
import { Addresses, isEqual } from "@/lib/utils";

type Props = {
  targetCosmo: PublicCosmo;
};

export default function ProfileRenderer({ targetCosmo }: Props) {
  const { user } = useUserState();
  const gridColumns = useGridColumns();

  const { searchParams, showLocked, setShowLocked, dataSource, setDataSource } =
    useFilters({
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

      {/* display */}
      {(() => {
        switch (dataSource) {
          case "blockchain":
            return (
              <Blockchain
                gridColumns={gridColumns}
                targetCosmo={targetCosmo}
                searchParams={searchParams}
                showLocked={showLocked}
              />
            );
          case "blockchain-groups":
            return (
              <BlockchainGroups
                gridColumns={gridColumns}
                targetCosmo={targetCosmo}
                searchParams={searchParams}
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
