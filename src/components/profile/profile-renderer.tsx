"use client";

import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { useFilters } from "@/hooks/use-filters";
import {
  CollectionFilters,
  FiltersContainer,
} from "../collection/filters-container";
import Portal from "../portal";
import HelpDialog from "./help-dialog";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import SendObjekts from "../overlay/send-objekts";
import { match } from "ts-pattern";
import Blockchain from "../collection/data-sources/blockchain";
import CosmoCollectionGroups from "../collection/data-sources/cosmo-groups";
import CosmoLegacy from "../collection/data-sources/cosmo-legacy";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  profile: PublicProfile;
  user?: PublicProfile;
};

export default function ProfileRenderer({ artists, profile, user }: Props) {
  const authenticated = user?.address === profile.address;

  const { searchParams, showLocked, setShowLocked, dataSource, setDataSource } =
    useFilters({
      dataSource: authenticated ? "cosmo" : "cosmo-legacy",
    });

  return (
    <div className="relative flex flex-col">
      <Portal to="#help">
        <HelpDialog />
      </Portal>

      <FiltersContainer isPortaled>
        <CollectionFilters
          allowCosmoGroups={authenticated}
          showLocked={showLocked}
          setShowLocked={setShowLocked}
          allowSerials={dataSource === "blockchain"}
          dataSource={dataSource}
          setDataSource={setDataSource}
        />
      </FiltersContainer>

      {/* display */}
      {match(dataSource)
        .with("blockchain", () => (
          <Blockchain
            artists={artists}
            authenticated={authenticated}
            profile={profile}
            user={user}
            searchParams={searchParams}
            showLocked={showLocked}
          />
        ))
        .with("cosmo", () => (
          <CosmoCollectionGroups
            artists={artists}
            authenticated={authenticated}
            profile={profile}
            user={user}
            searchParams={searchParams}
            showLocked={showLocked}
          />
        ))
        .with("cosmo-legacy", () => (
          <CosmoLegacy
            artists={artists}
            authenticated={authenticated}
            profile={profile}
            searchParams={searchParams}
            showLocked={showLocked}
          />
        ))
        .exhaustive()}

      <SendObjekts />
    </div>
  );
}
