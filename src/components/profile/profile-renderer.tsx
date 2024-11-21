"use client";

import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { COSMO_ENDPOINT, ValidSort } from "@/lib/universal/cosmo/common";
import { OwnedObjektsResult } from "@/lib/universal/cosmo/objekts";
import { useFilters } from "@/hooks/use-filters";
import { ReactNode, useCallback } from "react";
import {
  CollectionFilters,
  FiltersContainer,
} from "../collection/filters-container";
import CollectionObjektDisplay from "../collection/collection-objekt-display";
import { parsePage } from "@/lib/universal/objekts";
import { ofetch } from "ofetch";
import Portal from "../portal";
import HelpDialog from "./help-dialog";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { baseUrl } from "@/lib/utils";
import SendObjekts from "../overlay/send-objekts";

type Props = {
  artists: CosmoArtistWithMembers[];
  profile: PublicProfile;
  user?: PublicProfile;
  previousIds: ReactNode;
};

export default function ProfileRenderer({
  artists,
  profile,
  user,
  previousIds,
}: Props) {
  const { searchParams, showLocked, setShowLocked, dataSource, setDataSource } =
    useFilters();

  const queryFunction = useCallback(
    async ({ pageParam = 0 }: { pageParam?: number }) => {
      const endpoint =
        dataSource === "cosmo"
          ? `${COSMO_ENDPOINT}/objekt/v1/owned-by/${profile.address}`
          : new URL(
              `/api/objekts/by-address/${profile.address}`,
              baseUrl()
            ).toString();

      const pagination =
        dataSource === "cosmo"
          ? { start_after: pageParam.toString() }
          : { page: pageParam.toString() };

      // ensure we don't send serial sorting to cosmo or else it 400's
      const sort = searchParams.get("sort") as ValidSort;
      const sortReset =
        dataSource === "cosmo" &&
        (sort === "serialAsc" || sort === "serialDesc")
          ? { sort: "newest" }
          : {};

      return await ofetch(endpoint, {
        query: {
          ...Object.fromEntries(searchParams.entries()),
          ...pagination,
          ...sortReset,
        },
      }).then((res) => parsePage<OwnedObjektsResult>(res));
    },
    [profile.address, searchParams, dataSource]
  );

  return (
    <div className="relative flex flex-col">
      <Portal to="#help">
        <HelpDialog previousIds={previousIds} />
      </Portal>

      <FiltersContainer isPortaled>
        <CollectionFilters
          showLocked={showLocked}
          setShowLocked={setShowLocked}
          allowSerials={dataSource === "blockchain"}
          dataSource={dataSource}
          setDataSource={setDataSource}
        />
      </FiltersContainer>

      <CollectionObjektDisplay
        authenticated={profile.address === user?.address}
        address={profile.address}
        showLocked={showLocked}
        artists={artists}
        queryFunction={queryFunction}
        gridColumns={profile?.gridColumns ?? user?.gridColumns}
        dataSource={dataSource}
      />

      <SendObjekts />
    </div>
  );
}
