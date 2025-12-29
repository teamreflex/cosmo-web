import { m } from "@/i18n/messages";
import {
  objektIndexBlockchainQuery,
  objektIndexTypesenseQuery,
} from "@/lib/queries/objekt-queries";
import { track } from "@/lib/utils";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect } from "react";
import { useArtists } from "./use-artists";
import { objektOptions } from "./use-objekt-response";

const route = getRouteApi("/");

/**
 * Handles switching between the blockchain and Typesense APIs.
 */
export function useObjektIndex() {
  const searchParams = route.useSearch({
    select: (search) => ({
      sort: search.sort,
      season: search.season,
      class: search.class,
      on_offline: search.on_offline,
      member: search.member,
      artist: search.artist,
      collectionNo: search.collectionNo,
      search: search.search,
    }),
  });
  const { selectedIds } = useArtists();

  // track when a user searches for an objekt
  useEffect(() => {
    if (searchParams.search && searchParams.search.length > 0) {
      track("objekt-search");
    }
  }, [searchParams]);

  // if no search, use the default API
  if (!searchParams.search) {
    return objektOptions({
      filtering: "remote",
      query: objektIndexBlockchainQuery(searchParams, selectedIds),
      calculateTotal: (data) => {
        const total = data.pages[0]?.total ?? 0;
        return (
          <p className="font-semibold">
            {total.toLocaleString("en")} {m.common_total()}
          </p>
        );
      },
      getItems: (data) => data.pages.flatMap((page) => page.objekts),
    });
  }

  // otherwise, use the typesense API
  return objektOptions({
    filtering: "remote",
    query: objektIndexTypesenseQuery(searchParams, selectedIds),
    calculateTotal: (data) => {
      const total = data.pages[0]?.total ?? 0;
      return (
        <p className="font-semibold">
          {total.toLocaleString("en")} {m.common_total()}
        </p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });
}
