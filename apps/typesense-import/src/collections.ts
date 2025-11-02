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

export function getShortCode(collectionNo: string, season: string) {
  const match = season.match(/([A-Za-z]+)(\d+)/);
  if (!match) return `${season.at(0)}${collectionNo}`;
  const [, seasonText, seasonNum] = match;
  const firstLetter = seasonText.at(0) || "";
  const seasonPart = firstLetter.repeat(parseInt(seasonNum, 10));
  return `${seasonPart}${collectionNo}`;
}
