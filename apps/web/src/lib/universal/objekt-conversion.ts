import { slugifyObjekt } from "@apollo/util";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import type {
  BFFCollectionGroupCollection,
  BFFCollectionGroupObjekt,
  CosmoObjekt,
  NonTransferableReason,
  ScannedObjekt,
} from "@apollo/cosmo/types/objekts";
import type { IndexedObjekt } from "@/lib/universal/objekts";

export namespace Objekt {
  /**
   * Collection related fields.
   */
  export type Collection = {
    // comes directly from metadata
    artist: ValidArtist;
    member: string;
    season: string;
    class: string;
    collectionNo: string;
    collectionId: string;
    frontImage: string;
    backImage: string;
    backgroundColor: string;
    textColor: string;
    bandImageUrl: string | null;
    frontMedia: string | null;
    // derived from metadata
    slug: string;
    artistName: string;
    onOffline: "online" | "offline";
  };

  /**
   * Objekt specific fields.
   */
  export type Token = {
    serial: number;
    tokenId: number;
    transferable: boolean;
    status: "minted" | "pending";
    usedForGrid: boolean;
    lenticularPairTokenId: number;
    acquiredAt: string;
    nonTransferableReason?: NonTransferableReason;
  };

  export type Objekt = {
    collection: Collection;
    objekt: Token;
  };

  /**
   * Converts a collection from the indexer to the common fields.
   */
  export function fromIndexer(objekt: IndexedObjekt): Objekt.Collection {
    const collection = {
      artist: objekt.artist.toLowerCase() as ValidArtist,
      member: objekt.member,
      season: objekt.season,
      class: objekt.class,
      collectionNo: objekt.collectionNo,
      collectionId: objekt.collectionId,
      frontImage: objekt.frontImage,
      backImage: objekt.backImage,
      backgroundColor: objekt.backgroundColor,
      textColor: objekt.textColor,
      bandImageUrl: objekt.bandImageUrl,
      frontMedia: objekt.frontMedia,
    };

    return { ...collection, ...deriveExtras(collection) };
  }

  /**
   * Converts an objekt from the Cosmo legacy endpoint to the common fields.
   */
  export function fromLegacy(objekt: CosmoObjekt): Objekt.Objekt {
    const collection = {
      artist: objekt.artists[0]!,
      member: objekt.member,
      season: objekt.season,
      class: objekt.class,
      collectionNo: objekt.collectionNo,
      collectionId: objekt.collectionId,
      frontImage: objekt.frontImage,
      backImage: objekt.backImage,
      backgroundColor: objekt.backgroundColor,
      textColor: objekt.textColor,
      bandImageUrl: objekt.bandImageUrl,
      frontMedia: objekt.frontMedia,
    };

    return {
      collection: { ...collection, ...deriveExtras(collection) },
      objekt: {
        serial: objekt.objektNo,
        tokenId: parseInt(objekt.tokenId),
        transferable: objekt.transferable,
        status: objekt.status,
        usedForGrid: objekt.usedForGrid,
        lenticularPairTokenId: objekt.lenticularPairTokenId
          ? parseInt(objekt.tokenId)
          : 0,
        acquiredAt: objekt.receivedAt,
        nonTransferableReason: objekt.nonTransferableReason,
      },
    };
  }

  /**
   * Converts an objekt from the collection group to the common fields.
   */
  export function fromCollectionGroup(opts: {
    collection: BFFCollectionGroupCollection;
    objekt: BFFCollectionGroupObjekt;
  }): Objekt.Objekt;
  export function fromCollectionGroup(opts: {
    collection: BFFCollectionGroupCollection;
  }): Objekt.Collection;
  export function fromCollectionGroup(opts: {
    objekt: BFFCollectionGroupObjekt;
  }): Objekt.Token;
  export function fromCollectionGroup(opts: {
    collection?: BFFCollectionGroupCollection;
    objekt?: BFFCollectionGroupObjekt;
  }): Objekt.Collection | Objekt.Token | Objekt.Objekt {
    // convert collection
    let collection: Objekt.Collection | undefined;
    if (opts.collection) {
      const base = {
        artist: opts.collection.artistName as ValidArtist,
        member: opts.collection.member,
        season: opts.collection.season,
        class: opts.collection.class,
        collectionNo: opts.collection.collectionNo,
        collectionId: opts.collection.collectionId,
        frontImage: opts.collection.frontImage,
        backImage: opts.collection.backImage,
        backgroundColor: opts.collection.backgroundColor,
        textColor: opts.collection.textColor,
        bandImageUrl: opts.collection.bandImageUrl,
        frontMedia: opts.collection.frontMedia,
      };
      collection = { ...base, ...deriveExtras(base) };
    }

    // convert objekt
    let objekt: Objekt.Token | undefined;
    if (opts.objekt) {
      objekt = {
        serial: opts.objekt.metadata.objektNo,
        tokenId: opts.objekt.metadata.tokenId,
        transferable: opts.objekt.metadata.transferable,
        status: opts.objekt.inventory.status,
        usedForGrid: opts.objekt.inventory.usedForGrid,
        lenticularPairTokenId: opts.objekt.inventory.lenticularPairTokenId,
        acquiredAt: opts.objekt.inventory.acquiredAt,
        nonTransferableReason: opts.objekt.nonTransferableReason,
      };
    }

    if (collection && objekt) {
      return { collection, objekt };
    } else if (collection) {
      return collection;
    } else if (objekt) {
      return objekt;
    }

    throw new Error("No collection or objekt provided");
  }

  /**
   * Converts an objekt from a scan result to the common fields.
   */
  export function fromScanned({ objekt }: ScannedObjekt): Objekt.Collection {
    const collection = {
      artist: objekt.artists[0] as ValidArtist,
      member: objekt.member,
      season: objekt.season,
      class: objekt.class,
      collectionNo: objekt.collectionNo,
      collectionId: objekt.collectionId,
      frontImage: objekt.frontImage,
      backImage: objekt.backImage,
      backgroundColor: objekt.backgroundColor,
      textColor: objekt.textColor,
      bandImageUrl: null,
      frontMedia: null,
    };

    return { ...collection, ...deriveExtras(collection) };
  }
}

type DerivedExtras = Pick<
  Objekt.Collection,
  "slug" | "artistName" | "onOffline"
> &
  ColorFixes;

/**
 * Derives extra fields from the objekt.
 */
function deriveExtras(
  objekt: Omit<Objekt.Collection, "slug" | "artistName" | "onOffline">,
): DerivedExtras {
  const slug = slugifyObjekt(objekt.collectionId);

  return {
    get slug() {
      return slug;
    },
    get artistName() {
      return artistMap[objekt.artist.toLowerCase()] ?? "";
    },
    get onOffline() {
      const suffix = objekt.collectionNo.at(-1);
      if (!suffix) {
        throw new Error("Invalid collectionNo");
      }
      return onOfflineMap[suffix] ?? "online";
    },
    ...colorFixes[slug],
  };
}

const artistMap: Record<string, string> = {
  artms: "ARTMS",
  triples: "tripleS",
  idntt: "idntt",
};

const onOfflineMap: Record<string, "online" | "offline"> = {
  Z: "online",
  A: "offline",
};

type ColorFixes = Partial<
  Pick<Objekt.Collection, "backgroundColor" | "textColor">
>;

/**
 * COSMO doesn't use the objekt background color,
 * so sometimes they're incorrect and need manually fixing.
 */
const colorFixes: Record<string, ColorFixes> = {
  // Heejin <K> MMT POBs: fix text color
  "atom01-heejin-322z": {
    textColor: "#FFFFFF",
  },
  "atom01-heejin-323z": {
    textColor: "#FFFFFF",
  },
  "atom01-heejin-324z": {
    textColor: "#FFFFFF",
  },
  "atom01-heejin-325z": {
    textColor: "#FFFFFF",
  },
  // Choerry Binary01 grids: fix background color
  "binary01-choerry-201z": {
    backgroundColor: "#FFFFFF",
  },
  "binary01-choerry-202z": {
    backgroundColor: "#FFFFFF",
  },
  // Dahyun Cream grids: fix background color
  "cream01-dahyun-203z": {
    backgroundColor: "#FFFFFF",
  },
  "cream01-dahyun-204z": {
    backgroundColor: "#FFFFFF",
  },
  // Seoyeon Divine01 3rd edition: fix background color
  "divine01-seoyeon-117z": {
    backgroundColor: "#B400FF",
  },
  "divine01-seoyeon-118z": {
    backgroundColor: "#B400FF",
  },
  "divine01-seoyeon-119z": {
    backgroundColor: "#B400FF",
  },
  "divine01-seoyeon-120z": {
    backgroundColor: "#B400FF",
  },
  // Seoyeon Everline A24 POB: fix background color
  "divine01-seoyeon-317z": {
    backgroundColor: "#df2e37",
  },
  // Seoyeon Assemble 2nd anniversary: fix text color
  "ever01-seoyeon-338z": {
    textColor: "#07328D",
  },
};
