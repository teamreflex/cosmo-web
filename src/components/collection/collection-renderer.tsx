"use client";

import { TokenPayload } from "@/lib/universal/auth";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { OwnedObjektsResult } from "@/lib/universal/cosmo/objekts";
import HelpDialog from "../profile/help-dialog";
import PolygonButton from "../profile/polygon-button";
import OpenSeaButton from "../profile/opensea-button";
import TradesButton from "../profile/trades-button";
import CopyAddressButton from "../profile/copy-address-button";
import BackButton from "../profile/back-button";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { Fragment, memo, useCallback } from "react";
import { CollectionFilters, FiltersContainer } from "./filters-container";
import ObjektSidebar from "../objekt/objekt-sidebar";
import InformationOverlay from "../objekt/information-overlay";
import ActionOverlay from "../objekt/action-overlay";
import CollectionObjektDisplay from "./collection-objekt-display";
import { parsePage } from "@/lib/universal/objekts";

type Props = {
  lockedObjekts: number[];
  artists: CosmoArtistWithMembers[];
  user: TokenPayload;
};

export default function CollectionRenderer({
  lockedObjekts,
  artists,
  user,
}: Props) {
  const [
    searchParams,
    showLocked,
    setShowLocked,
    cosmoFilters,
    setCosmoFilters,
    updateCosmoFilters,
  ] = useCosmoFilters();

  const queryFunction = useCallback(
    async ({ pageParam = 0 }: { pageParam?: number }) => {
      const query = new URLSearchParams(searchParams);
      query.set("start_after", pageParam.toString());

      const result = await fetch(
        `${COSMO_ENDPOINT}/objekt/v1/owned-by/${
          user.address
        }?${query.toString()}`
      );
      return parsePage<OwnedObjektsResult>(await result.json());
    },
    [searchParams]
  );

  return (
    <div className="flex flex-col">
      <div className="flex flex-col md:flex-row items-center justify-between gap-2 pb-2">
        <Title />
        <DesktopOptions nickname={user.nickname} address={user.address} />
      </div>

      <FiltersContainer buttons={<MobileOptions nickname={user.nickname} />}>
        <CollectionFilters
          showLocked={showLocked}
          setShowLocked={setShowLocked}
          cosmoFilters={cosmoFilters}
          updateCosmoFilters={updateCosmoFilters}
        />
      </FiltersContainer>

      <CollectionObjektDisplay
        authenticated={true}
        address={user.address}
        lockedTokenIds={lockedObjekts}
        showLocked={showLocked}
        artists={artists}
        filters={cosmoFilters}
        setFilters={setCosmoFilters}
        queryFunction={queryFunction}
      />
    </div>
  );
}

const Title = memo(function Title() {
  return (
    <div className="flex gap-2 justify-between items-center w-full md:w-auto">
      <div className="flex gap-2 items-center">
        <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
          Collect
        </h1>

        <HelpDialog />
      </div>

      <div id="objekt-total" />
    </div>
  );
});

const DesktopOptions = memo(function DesktopOptions({
  address,
  nickname,
}: {
  address: string;
  nickname: string;
}) {
  return (
    <div className="hidden sm:flex items-center gap-2">
      <PolygonButton address={address} />
      <OpenSeaButton address={address} />
      <BackButton url={`/@${nickname}`} tooltip="View Profile" />
      <TradesButton nickname={nickname} />
      <CopyAddressButton address={address} />
    </div>
  );
});

const MobileOptions = memo(function MobileOptions({
  nickname,
}: {
  nickname: string;
}) {
  return (
    <Fragment>
      <TradesButton nickname={nickname} />
      <BackButton url={`/@${nickname}`} tooltip="View Profile" />
    </Fragment>
  );
});

const ObjektOverlay = memo(function ObjektOverlay() {
  return (
    <Fragment>
      <ObjektSidebar />
      <InformationOverlay />
      <ActionOverlay />
    </Fragment>
  );
});
