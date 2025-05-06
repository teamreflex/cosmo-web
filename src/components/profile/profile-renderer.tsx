"use client";

import { useFilters } from "@/hooks/use-filters";
import FiltersContainer from "../collection/filters-container";
import Portal from "../portal";
import HelpDialog from "./help-dialog";
import { match } from "ts-pattern";
import Blockchain from "../collection/data-sources/blockchain";
import BlockchainGroups from "../collection/data-sources/blockchain-groups";
import CollectionFilters from "../collection/filter-contexts/collection-filters";
import { AuthenticatedContext } from "@/hooks/use-authenticated";
import { PublicUser } from "@/lib/universal/auth";
import { useProfileContext } from "@/hooks/use-profile";

type Props = {
  targetUser: PublicUser;
};

export default function ProfileRenderer({ targetUser }: Props) {
  const currentUser = useProfileContext((ctx) => ctx.currentUser);
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
              gridColumns={gridColumns}
              targetUser={targetUser}
              currentUser={currentUser}
              searchParams={searchParams}
              showLocked={showLocked}
            />
          ))
          .with("blockchain-groups", () => (
            <BlockchainGroups
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
