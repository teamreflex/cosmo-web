"use client";

import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { useFilters } from "@/hooks/use-filters";
import FiltersContainer from "../collection/filters-container";
import Portal from "../portal";
import HelpDialog from "./help-dialog";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { match } from "ts-pattern";
import Blockchain from "../collection/data-sources/blockchain";
import BlockchainGroups from "../collection/data-sources/blockchain-groups";
import CollectionFilters from "../collection/filter-contexts/collection-filters";
import { AuthenticatedContext } from "@/hooks/use-authenticated";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  targetUser: PublicProfile;
  currentUser?: PublicProfile;
};

export default function ProfileRenderer({
  artists,
  targetUser,
  currentUser,
}: Props) {
  const gridColumns = targetUser.gridColumns ?? currentUser?.gridColumns;

  const { searchParams, showLocked, setShowLocked, dataSource, setDataSource } =
    useFilters({
      dataSource: "blockchain",
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
      <AuthenticatedContext.Provider value={false}>
        {match(dataSource)
          .with("blockchain", () => (
            <Blockchain
              artists={artists}
              gridColumns={gridColumns}
              targetUser={targetUser}
              currentUser={currentUser}
              searchParams={searchParams}
              showLocked={showLocked}
            />
          ))
          .with("blockchain-groups", () => (
            <BlockchainGroups
              artists={artists}
              gridColumns={gridColumns}
              targetUser={targetUser}
              currentUser={currentUser}
              searchParams={searchParams}
              showLocked={showLocked}
            />
          ))
          .exhaustive()}
      </AuthenticatedContext.Provider>
    </div>
  );
}
