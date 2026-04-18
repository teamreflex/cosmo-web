import { useFilters } from "@/hooks/use-filters";
import { useGridColumns } from "@/hooks/use-grid-columns";
import { useUserState } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { Addresses, isEqual } from "@apollo/util";
import Blockchain from "../collection/data-sources/blockchain";
import BlockchainGroups from "../collection/data-sources/blockchain-groups";
import CollectionFilters from "../collection/filter-contexts/collection-filters";
import FilterHeader from "../collection/filter-header";
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

  const isSpin = isEqual(targetCosmo.address, Addresses.SPIN);
  const { showLocked, setShowLocked, dataSource, setDataSource } = useFilters({
    dataSource: isSpin ? "blockchain" : user?.collectionMode,
  });

  return (
    <div className="relative flex flex-col">
      <Portal to="#help">
        <HelpDialog />
      </Portal>

      <FilterHeader title={m.collection_title()}>
        <div className="ml-auto md:pointer-events-none md:absolute md:inset-0 md:ml-0 md:flex md:items-center md:justify-center">
          <div className="md:pointer-events-auto">
            <CosmoMemberFilter />
          </div>
        </div>
      </FilterHeader>

      <FiltersContainer>
        <CollectionFilters
          dataSource={dataSource}
          setDataSource={setDataSource}
          showLocked={showLocked}
          setShowLocked={setShowLocked}
          isSpin={isSpin}
        />
      </FiltersContainer>

      <div className="container flex flex-col">
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
    </div>
  );
}
