import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { ofetch } from "ofetch";
import { LegacyObjektResponse, parsePage } from "@/lib/universal/objekts";
import { CosmoObjekt, OwnedObjektsResult } from "@/lib/universal/cosmo/objekts";
import { baseUrl } from "@/lib/utils";
import { useProfileContext } from "@/hooks/use-profile";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import FilteredObjektDisplay from "@/components/objekt/filtered-objekt-display";
import { useMemo } from "react";
import { filtersAreDirty } from "@/hooks/use-filters";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { LegacyOverlay } from "./common-legacy";
import ExpandableObjekt from "@/components/objekt/objekt-expandable";
import { Objekt } from "@/lib/universal/objekt-conversion";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  authenticated: boolean;
  profile: PublicProfile;
  user?: PublicProfile;
  searchParams: URLSearchParams;
  showLocked: boolean;
};

export default function Blockchain(props: Props) {
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
    queryKey: ["collection", "blockchain", props.profile.address],
    queryFunction: async ({ pageParam = 0 }: { pageParam?: number }) => {
      const endpoint = new URL(
        `/api/objekts/by-address/${props.profile.address}`,
        baseUrl()
      ).toString();

      return await ofetch(endpoint, {
        query: {
          ...Object.fromEntries(props.searchParams.entries()),
          page: pageParam,
        },
      }).then((res) => parsePage<OwnedObjektsResult>(res));
    },
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    calculateTotal: (data) => {
      const total = data.pages[0].total ?? 0;
      return (
        <p className="font-semibold">{total.toLocaleString("en")} total</p>
      );
    },
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
      {({ item, id, isPin }) => {
        if (!shouldRender(item)) return null;

        const objekt = Objekt.fromLegacy(item);
        return (
          <ExpandableObjekt objekt={objekt} id={id}>
            <LegacyOverlay
              objekt={item}
              slug={objekt.slug}
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
