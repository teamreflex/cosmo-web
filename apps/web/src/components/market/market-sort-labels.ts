import { m } from "@/i18n/messages";
import type { MarketSort } from "@/lib/universal/market";

export const marketSortLabels = {
  floorAsc: m.filter_sort_floor_asc(),
  floorDesc: m.filter_sort_floor_desc(),
  mostListed: m.filter_sort_most_listed(),
  recentlyListed: m.filter_sort_recently_listed(),
} satisfies Record<MarketSort, string>;

export const marketSortSublabels = {
  floorAsc: m.filter_sort_floor_asc_sub(),
  floorDesc: m.filter_sort_floor_desc_sub(),
  mostListed: m.filter_sort_most_listed_sub(),
  recentlyListed: m.filter_sort_recently_listed_sub(),
} satisfies Record<MarketSort, string>;
