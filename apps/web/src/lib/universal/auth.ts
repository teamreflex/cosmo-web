import type { CollectionDataSource } from "@apollo/util";

export type PublicUser = {
  id: string;
  username: string | undefined;
  image: string | undefined;
  gridColumns: number;
  collectionMode: CollectionDataSource;
  social: {
    discord: string | undefined;
    twitter: string | undefined;
  };
  showSocials: boolean;
} & { __brand: "PublicUser" };

/**
 * The signed-in user's own account. It carries settings that other users'
 * payloads leave out, since the display currency hints at a user's country.
 */
export type CurrentUser = PublicUser & {
  // stored display currency, null means DEFAULT_CURRENCY
  currency: string | null;
};
