export const COSMO_ENDPOINT = "https://api.cosmo.fans";

export const validArtists = ["artms", "tripleS"] as const;
export type ValidArtist = (typeof validArtists)[number];
export const validSorts = [
  "newest",
  "oldest",
  "noAscending",
  "noDescending",
] as const;
export type ValidSort = (typeof validSorts)[number];
export const validSeasons = ["Atom01", "Binary01", "Cream01"] as const;
export type ValidSeason = (typeof validSeasons)[number];
export const validClasses = [
  "First",
  "Special",
  "Double",
  "Welcome",
  "Zero",
] as const;
export type ValidClass = (typeof validClasses)[number];
export const validOnlineTypes = ["online", "offline"] as const;
export type ValidOnlineType = (typeof validOnlineTypes)[number];
