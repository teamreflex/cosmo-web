export const COSMO_ENDPOINT = "https://api.cosmo.fans";

// artists
export const validArtists = ["artms", "tripleS", "idntt"] as const;
export type ValidArtist = (typeof validArtists)[number];

// sort values
export const validSorts = [
  "newest",
  "oldest",
  "noAscending",
  "noDescending",
  // should not be sent to cosmo
  "serialAsc",
  "serialDesc",
] as const;
export type ValidSort = (typeof validSorts)[number];

// seasons
export const validSeasons = [
  "Atom01",
  "Binary01",
  "Cream01",
  "Divine01",
  "Ever01",
  "Atom02",
] as const;
export type ValidSeason = (typeof validSeasons)[number];

// classes
export const validClasses = [
  "First",
  "Special",
  "Double",
  "Premier",
  "Welcome",
  "Zero",
] as const;
export type ValidClass = (typeof validClasses)[number];

// online types
export const validOnlineTypes = ["online", "offline"] as const;
export type ValidOnlineType = (typeof validOnlineTypes)[number];
