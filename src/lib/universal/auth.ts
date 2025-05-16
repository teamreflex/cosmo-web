import { CollectionDataSource } from "../utils";

export type PublicUser = {
  id: string;
  username: string | undefined;
  image: string | undefined;
  isAdmin: boolean;
  gridColumns: number;
  collectionMode: CollectionDataSource;
  social: {
    discord: string | undefined;
    twitter: string | undefined;
  };
  showSocials: boolean;
};
