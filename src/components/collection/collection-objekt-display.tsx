import { LockedObjektContext } from "@/context/objekt";
import {
  CollectionFilters,
  collectionFilters,
} from "@/hooks/use-collection-filters";
import { toSearchParams } from "@/hooks/use-typed-search-params";
import {
  COSMO_ENDPOINT,
  CosmoArtistWithMembers,
  OwnedObjekt,
  OwnedObjektsResult,
} from "@/lib/universal/cosmo";
import { useState } from "react";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import ObjektSidebar from "../objekt/objekt-sidebar";
import InformationOverlay from "../objekt/information-overlay";
import ActionOverlay from "../objekt/action-overlay";

type Props = {
  authenticated: boolean;
  address: string;
  lockedTokenIds: number[];
  showLocked: boolean;
  artists: CosmoArtistWithMembers[];
  filters: CollectionFilters;
  setFilters: (filters: CollectionFilters) => void;
};

export default function CollectionObjektDisplay({
  authenticated,
  address,
  lockedTokenIds,
  showLocked,
  artists,
  filters,
  setFilters,
}: Props) {
  const [lockedTokens, setLockedTokens] = useState<number[]>(lockedTokenIds);

  function onTokenLock(tokenId: number) {
    if (lockedTokens.includes(tokenId)) {
      setLockedTokens((prev) => prev.filter((id) => id !== tokenId));
    } else {
      setLockedTokens((prev) => [...prev, tokenId]);
    }
  }

  function shouldShowObjekt(objekt: OwnedObjekt) {
    return showLocked
      ? true
      : lockedTokens.includes(parseInt(objekt.tokenId)) === false;
  }

  async function fetcher({ pageParam = 0 }) {
    const searchParams = toSearchParams<typeof collectionFilters>(
      filters,
      true,
      ["show_locked"]
    );
    searchParams.set("start_after", pageParam.toString());

    const result = await fetch(
      `${COSMO_ENDPOINT}/objekt/v1/owned-by/${address}?${searchParams.toString()}`
    );
    return (await result.json()) as OwnedObjektsResult;
  }

  return (
    <LockedObjektContext.Provider
      value={{
        lockedObjekts: lockedTokens,
        lockObjekt: onTokenLock,
      }}
    >
      <FilteredObjektDisplay
        artists={artists}
        filters={filters}
        setFilters={setFilters}
        authenticated={authenticated}
        queryFunction={fetcher}
        queryKey={`collection::${address}`}
        getObjektId={(objekt: OwnedObjekt) => objekt.tokenId}
        getObjektDisplay={shouldShowObjekt}
        objektSlot={
          <>
            <ObjektSidebar />
            <InformationOverlay />
            <ActionOverlay />
          </>
        }
      />
    </LockedObjektContext.Provider>
  );
}
