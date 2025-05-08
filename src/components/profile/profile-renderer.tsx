"use client";

import { useFilters } from "@/hooks/use-filters";
import FiltersContainer from "../collection/filters-container";
import Portal from "../portal";
import HelpDialog from "./help-dialog";
import { match } from "ts-pattern";
import Blockchain from "../collection/data-sources/blockchain";
import BlockchainGroups from "../collection/data-sources/blockchain-groups";
import CollectionFilters from "../collection/filter-contexts/collection-filters";
import { useProfileContext } from "@/hooks/use-profile";
import { PublicCosmo } from "@/lib/universal/cosmo-accounts";

type Props = {
  targetCosmo: PublicCosmo;
};

export default function ProfileRenderer({ targetCosmo }: Props) {
  const account = useProfileContext((ctx) => ctx.account);
  const gridColumns = useProfileContext((ctx) => ctx.gridColumns);

  const { searchParams, showLocked, setShowLocked, dataSource, setDataSource } =
    useFilters({
      dataSource: account?.user?.collectionMode,
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
      {match(dataSource)
        .with("blockchain", () => (
          <Blockchain
            gridColumns={gridColumns}
            targetCosmo={targetCosmo}
            searchParams={searchParams}
            showLocked={showLocked}
          />
        ))
        .with("blockchain-groups", () => (
          <BlockchainGroups
            gridColumns={gridColumns}
            targetCosmo={targetCosmo}
            searchParams={searchParams}
            showLocked={showLocked}
          />
        ))
        .exhaustive()}
    </div>
  );
}
