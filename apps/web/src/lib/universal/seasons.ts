/**
 * Colors and order for each season.
 */
const seasonConfig = {
  atom: {
    color: "#FFDD00",
    order: 0,
  },
  binary: {
    color: "#75FB4C",
    order: 1,
  },
  cream: {
    color: "#FF7477",
    order: 2,
  },
  divine: {
    color: "#B400FF",
    order: 3,
  },
  ever: {
    color: "#33ecfd",
    order: 4,
  },
  summer: {
    color: "#619AFF",
    order: 0,
  },
  autumn: {
    color: "#B5315A",
    order: 1,
  },
  winter: {
    color: "#C6C6C6",
    order: 2,
  },
  spring: {
    color: "#FFE527",
    order: 3,
  },
} as const;
type Season = keyof typeof seasonConfig;

/**
 * Extract the season name and number from a season string.
 */
function extractSeason(season: string): [Season, number] | null {
  const match = season.match(/^([a-zA-Z]+)(\d+)?$/);
  if (!match) return null;
  // SAFETY: membership is validated against seasonConfig on the next line
  const name = match[1]?.toLowerCase() as Season;
  if (!(name in seasonConfig)) return null;
  const num = match[2] ? parseInt(match[2], 10) : 0;
  return [name, num];
}

/**
 * Get the color for a season.
 */
export function getSeasonColor(season: string) {
  const match = extractSeason(season);
  return match ? seasonConfig[match[0]].color : null;
}

/**
 * Collapse a season into a single chronological value.
 * A seasonal cycle runs summer -> autumn -> winter -> spring, where winter
 * and spring carry the next calendar year's number but belong to the cycle
 * that started the previous summer, so they're attributed to that cycle.
 */
function seasonSortValue(season: Season, number: number) {
  const cycle =
    season === "winter" || season === "spring" ? number - 1 : number;
  return cycle * 10 + seasonConfig[season].order;
}

/**
 * Remap seasons to a consistent order, newest first.
 * Sorts by cycle descending, then by season order within the cycle descending.
 */
export function seasonSort(a: string, b: string) {
  const aMatch = extractSeason(a);
  const bMatch = extractSeason(b);
  if (!aMatch || !bMatch) return 0;

  return seasonSortValue(...bMatch) - seasonSortValue(...aMatch);
}
