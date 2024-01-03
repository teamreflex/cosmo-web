export const COSMO_ENDPOINT = "https://api.cosmo.fans";

// artists
export enum ValidArtists {
  ARTMS = "artms",
  TRIPLES = "tripleS",
}
export const validArtists = ["artms", "tripleS"] as const;
export type ValidArtist = `${ValidArtists}`;

// sort values
export enum ValidSorts {
  NEWEST = "newest",
  OLDEST = "oldest",
  NO_ASCENDING = "noAscending",
  NO_DESCENDING = "noDescending",
  // should not be sent to cosmo
  SERIAL_ASCENDING = "serialAsc",
  SERIAL_DESCENDING = "serialDesc",
}
export const validSorts = [
  "newest",
  "oldest",
  "noAscending",
  "noDescending",
  "serialAsc",
  "serialDesc",
] as const;
export type ValidSort = `${ValidSorts}`;

// seasons
export enum ValidSeasons {
  ATOM = "Atom01",
  BINARY = "Binary01",
  CREAM = "Cream01",
}
export const validSeasons = ["Atom01", "Binary01", "Cream01"] as const;
export type ValidSeason = `${ValidSeasons}`;

// classes
export enum ValidClasses {
  FIRST = "First",
  SPECIAL = "Special",
  DOUBLE = "Double",
  WELCOME = "Welcome",
  ZERO = "Zero",
}
export const validClasses = [
  "First",
  "Special",
  "Double",
  "Welcome",
  "Zero",
] as const;
export type ValidClass = `${ValidClasses}`;

// online types
export enum ValidOnlineTypes {
  ONLINE = "online",
  OFFLINE = "offline",
}
export const validOnlineTypes = ["online", "offline"] as const;
export type ValidOnlineType = `${ValidOnlineTypes}`;
