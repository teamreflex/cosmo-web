import { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import { useUserState } from "@/hooks/use-user-state";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { COSMO_ENDPOINT, ValidSort } from "@/lib/universal/cosmo/common";
import {
  BFFCollectionGroup,
  BFFCollectionGroupResponse,
} from "@/lib/universal/cosmo/objekts";
import { ofetch } from "ofetch";

type Props = {
  profile: PublicProfile;
  searchParams: URLSearchParams;
};

export default function CosmoCollectionGroups(props: Props) {
  const { artist } = useUserState();

  /**
   * Query options
   */
  const options = {
    queryKey: ["collection", "cosmo", props.profile.address],
    queryFunction: async ({ pageParam = 0 }: { pageParam?: number }) => {
      const endpoint = new URL(
        "/bff/v1/objekt/collection-group",
        COSMO_ENDPOINT
      ).toString();

      // ensure we don't send serial sorting to cosmo or else it 400's
      const sort = props.searchParams.get("sort") as ValidSort;
      const sortReset =
        sort === "serialAsc" || sort === "serialDesc" ? { sort: "newest" } : {};

      return await ofetch<BFFCollectionGroupResponse>(endpoint, {
        query: {
          ...Object.fromEntries(props.searchParams.entries()),
          ...sortReset,
          page: pageParam,
          artistName: artist,
        },
      });
    },
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      lastPageParam ??= 0;
      return lastPage.collections.length === 20 ? lastPageParam + 1 : undefined;
    },
    calculateTotal: (data) => {
      const total = data.pages[0].collectionCount ?? 0;
      return total.toLocaleString();
    },
    getItems: (data) => data.pages.flatMap((page) => page.collections),
  } satisfies ObjektResponseOptions<
    BFFCollectionGroupResponse,
    BFFCollectionGroup
  >;

  return <div>cosmo-groups</div>;
}
