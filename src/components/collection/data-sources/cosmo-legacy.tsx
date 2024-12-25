import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { ofetch } from "ofetch";
import { LegacyObjektResponse, parsePage } from "@/lib/universal/objekts";
import { CosmoObjekt } from "@/lib/universal/cosmo/objekts";
import { useProfileContext } from "@/hooks/use-profile";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import FilteredObjektDisplay from "@/components/objekt/filtered-objekt-display";
import { useMemo } from "react";
import { filtersAreDirty } from "@/hooks/use-filters";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { ExpandableObjekt } from "@/components/objekt/objekt";
import { ValidSort } from "@/lib/universal/cosmo/common";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { LegacyOverlay } from "./legacy-common";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  authenticated: boolean;
  profile: PublicProfile;
  user?: PublicProfile;
  searchParams: URLSearchParams;
  showLocked: boolean;
};

export default function CosmoLegacy(props: Props) {
  const [filters] = useCosmoFilters();
  const usingFilters = useMemo(() => filtersAreDirty(filters), [filters]);
  const pins = useProfileContext((ctx) => ctx.pins);
  const lockedObjekts = useProfileContext((ctx) => ctx.lockedObjekts);

  /**
   * Determine if the objekt should be rendered
   */
  const shouldRender = (objekt: CosmoObjekt) => {
    const isLocked = lockedObjekts.includes(parseInt(objekt.tokenId));
    const isPinned =
      pins.findIndex((pin) => pin.tokenId === objekt.tokenId) !== -1;

    // hide objekt from list when it's pinned
    const shouldDisplayPinned = !usingFilters && !isPinned;

    // hide locked objekts when the filter is toggled
    const shouldDisplayLocked = props.showLocked ? true : !isLocked;

    return usingFilters
      ? shouldDisplayLocked
      : shouldDisplayLocked && shouldDisplayPinned;
  };

  /**
   * Query options
   */
  const options = {
    queryKey: ["collection", "cosmo-legacy", props.profile.address],
    queryFunction: async ({ pageParam = 0 }: { pageParam?: number }) => {
      const endpoint = new URL(
        `/objekt/v1/owned-by/${props.profile.address}`,
        COSMO_ENDPOINT
      ).toString();

      // ensure we don't send serial sorting to cosmo or else it 400's
      const sort = props.searchParams.get("sort") as ValidSort;
      const sortReset =
        sort === "serialAsc" || sort === "serialDesc" ? { sort: "newest" } : {};

      return await ofetch(endpoint, {
        query: {
          ...Object.fromEntries(props.searchParams.entries()),
          ...sortReset,
          start_after: pageParam.toString(),
        },
      }).then((res) => parsePage<LegacyObjektResponse<CosmoObjekt>>(res));
    },
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    calculateTotal: () => null,
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  } satisfies ObjektResponseOptions<
    LegacyObjektResponse<CosmoObjekt>,
    CosmoObjekt
  >;

  return (
    <FilteredObjektDisplay
      artists={props.artists}
      options={options}
      getObjektId={(item) => item.tokenId}
      gridColumns={props.profile?.gridColumns ?? props.user?.gridColumns}
      hidePins={usingFilters}
      authenticated={props.authenticated}
    >
      {({ objekt, id, isPin }) => {
        if (!shouldRender(objekt)) return null;
        return (
          <ExpandableObjekt objekt={objekt} id={id}>
            <LegacyOverlay
              objekt={objekt}
              authenticated={props.authenticated}
              isPinned={pins.findIndex((p) => p.tokenId === id) !== -1}
              isPin={isPin}
            />
          </ExpandableObjekt>
        );
      }}
    </FilteredObjektDisplay>
  );
}
