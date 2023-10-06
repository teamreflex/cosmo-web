import { COSMO_ENDPOINT, ValidArtist, fetchArtist } from ".";
import { fetchSelectedArtist } from "../cache";

export async function fetchSelectedArtistWithGrid(userId: number) {
  const selectedArtist = (await fetchSelectedArtist(userId)) ?? "artms";
  return {
    selectedArtist,
    cosmoArtist: await fetchArtist(selectedArtist),
  };
}

export type GridStatus = {
  totalCompletedGrids: number;
  totalSpecialObjekts: number;
};

/**
 * Fetch the total number of grids completed for the artist.
 * @param token string
 * @param artist ValidArtist
 * @returns Promise<GridStatus>
 */
export async function fetchGridStatus(token: string, artist: ValidArtist) {
  const res = await fetch(`${COSMO_ENDPOINT}/grid/v3/${artist}/status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch grid status");
  }

  const result: GridStatus = await res.json();
  return result;
}

type CosmoGridEditionResult = {
  editions: CosmoGridEdition[];
};

export type CosmoGridEdition = {
  id: string;
  artist: ValidArtist;
  title: string;
  subtitle: string;
  image: string;
  order: number;
  createdAt: string;
  status: {
    totalGrids: number;
    completedGrids: number;
  };
  season: {
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    activeAt: string;
    order: number;
    id: number;
    artist: ValidArtist;
    title: string;
    image: string | null;
    startDate: string;
    endDate: string;
    ongoing: boolean;
  };
};

/**
 * Fetch all grid editions for the artist.
 * @param token string
 * @param artist ValidArtist
 * @returns Promise<CosmoGridEdition[]>
 */
export async function fetchEditions(token: string, artist: ValidArtist) {
  const res = await fetch(`${COSMO_ENDPOINT}/grid/v3/${artist}/edition`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch grid editions");
  }

  const { editions }: CosmoGridEditionResult = await res.json();
  return editions;
}

type CosmoGridSlot = {
  no: number;
  collections: string[];
};

type CosmoGridReward = {
  collectionId: string;
};

export type CosmoGrid = {
  id: string;
  member: string;
  memberImage: string;
  class: "First";
  edition: {
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    activeAt: string;
    order: number;
    id: string;
    artist: ValidArtist;
    title: string;
    subtitle: string;
    image: string;
    season: {
      createdAt: string;
      createdBy: string;
      updatedAt: string;
      activeAt: string;
      order: number;
      id: number;
      artist: ValidArtist;
      title: string;
      image: string | null;
      startDate: string;
      endDate: string | null;
    };
  };
  slots: CosmoGridSlot[];
  reward: CosmoGridReward[];
};

type CosmoGridResult = {
  grids: CosmoGrid[];
};

/**
 * Fetch all grids for the given edition.
 * @param token string
 * @param artist ValidArtist
 * @returns Promise<CosmoGrid[]>
 */
export async function fetchEdition(
  token: string,
  artist: ValidArtist,
  editionSlug: string
) {
  const res = await fetch(
    `${COSMO_ENDPOINT}/grid/v3/${artist}/edition/${editionSlug}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch grid edition "${editionSlug}"`);
  }

  const { grids }: CosmoGridResult = await res.json();
  return grids;
}

export type CosmoOngoingGridSlotWithoutPreferred = {
  no: number;
  completed: false;
};

export type CosmoOngoingGridSlotWithPreferred = {
  no: number;
  completed: false;
  preferredObjekt: {
    collectionId: string;
    season: string;
    member: string;
    collectionNo: string;
    class: string;
    artists: ValidArtist[];
    thumbnailImage: string;
    frontImage: string;
    backImage: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    comoAmount: number;
    transferableByDefault: boolean;
    tokenId: string;
    tokenAddress: string;
    objektNo: number;
    transferable: boolean;
  };
};

export type CosmoOngoingGridSlot =
  | CosmoOngoingGridSlotWithoutPreferred
  | CosmoOngoingGridSlotWithPreferred;

export type CosmoOngoingGrid = {
  ongoing: {
    id: number;
    slotStatuses: string[];
    allCompleted: boolean;
    rewardClaimed: boolean;
  };
  ownedRewardObjektCount: number;
};

/**
 * Fetch status of a grid.
 * @param token string
 * @param gridSlug string
 * @returns Promise<CosmoOngoingGrid>
 */
export async function fetchArtistGridStatus(token: string, gridSlug: string) {
  const res = await fetch(`${COSMO_ENDPOINT}/grid/v1/${gridSlug}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch grid "${gridSlug}"`);
  }

  const result: CosmoOngoingGrid = await res.json();
  return result;
}
