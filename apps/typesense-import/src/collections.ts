/**
 * Get the edition of a collection.
 * @example {collectionNo: "101Z", className: "First"} → "1st"
 * @example {collectionNo: "109Z", className: "First"} → "2nd"
 * @example {collectionNo: "117Z", className: "First"} → "3rd"
 * @example {collectionNo: "101Z", className: "Special"} → undefined
 */
export function getEdition(collectionNo: string, className: string) {
  if (className.toLowerCase() !== "first") {
    return undefined;
  }

  const collection = parseInt(collectionNo);

  if (collection >= 101 && collection <= 108) {
    return "1st";
  }
  if (collection >= 109 && collection <= 116) {
    return "2nd";
  }
  if (collection >= 117 && collection <= 120) {
    return "3rd";
  }

  return undefined;
}

/**
 * Convert the collection number and season to a short code.
 * @example {collectionNo: "101Z", season: "Atom01"} → "a101z"
 * @example {collectionNo: "101Z", season: "Atom02"} → "aa101z"
 * @example {collectionNo: "101Z", season: "Binary01"} → "b101z"
 */
export function getShortCode(collectionNo: string, season: string) {
  const match = season.match(/([A-Za-z]+)(\d+)/);
  if (!match) return `${season.at(0)}${collectionNo}`;
  const [, seasonText, seasonNum] = match;
  const firstLetter = seasonText.at(0) || "";
  const seasonPart = firstLetter.repeat(parseInt(seasonNum, 10));
  return `${seasonPart}${collectionNo}`;
}
