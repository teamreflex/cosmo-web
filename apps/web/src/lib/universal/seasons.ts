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
 * Remap seasons to a consistent order.
 * Primary sort by season number descending, secondary by season order descending.
 */
export function seasonSort(a: string, b: string) {
  const aMatch = extractSeason(a);
  const bMatch = extractSeason(b);
  if (!aMatch || !bMatch) return 0;

  const [aSeason, aNumber] = aMatch;
  const [bSeason, bNumber] = bMatch;

  // First sort by number descending
  if (aNumber !== bNumber) {
    return bNumber - aNumber;
  }

  // Then by season order descending
  return seasonConfig[bSeason].order - seasonConfig[aSeason].order;
}
