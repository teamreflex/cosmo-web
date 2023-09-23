export const COSMO_ENDPOINT = "https://api.cosmo.fans";

export const validArtists = ["artms", "tripleS"] as const;
export type ValidArtist = (typeof validArtists)[number];
