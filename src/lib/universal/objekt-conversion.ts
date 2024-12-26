import { ValidArtist } from "@/lib/universal/cosmo/common";
import {
  BFFCollectionGroupCollection,
  BFFCollectionGroupObjekt,
  CosmoObjekt,
  ScannedObjekt,
} from "@/lib/universal/cosmo/objekts";
import { IndexedObjekt } from "@/lib/universal/objekts";

export namespace Objekt {
  /**
   * Common fields to maximize compatibility.
   */
  export type Common = {
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
    // derived from metadata
    slug: string;
    artistName: string;
    onOffline: "online" | "offline";
  };

  /**
   * Converts a collection from the indexer to the common fields.
   */
  export function fromIndexer(objekt: IndexedObjekt): Objekt.Common {
    const base = {
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
    };
    return { ...base, ...deriveExtras(base) };
  }

  /**
   * Converts an objekt from the Cosmo legacy endpoint to the common fields.
   */
  export function fromLegacy(objekt: CosmoObjekt): Objekt.Common {
    const base = {
      artist: objekt.artists[0],
      member: objekt.member,
      season: objekt.season,
      class: objekt.class,
      collectionNo: objekt.collectionNo,
      collectionId: objekt.collectionId,
      frontImage: objekt.frontImage,
      backImage: objekt.backImage,
      backgroundColor: objekt.backgroundColor,
      textColor: objekt.textColor,
    };
    return { ...base, ...deriveExtras(base) };
  }

  /**
   * Converts an objekt from the collection group to the common fields.
   */
  export function fromCollectionGroup({
    collection,
  }: {
    collection: BFFCollectionGroupCollection;
    objekt: BFFCollectionGroupObjekt;
  }): Objekt.Common {
    const base = {
      artist: collection.artistName as ValidArtist,
      member: collection.member,
      season: collection.season,
      class: collection.class,
      collectionNo: collection.collectionNo,
      collectionId: collection.collectionId,
      frontImage: collection.frontImage,
      backImage: collection.backImage,
      backgroundColor: collection.backgroundColor,
      textColor: collection.textColor,
    };
    return { ...base, ...deriveExtras(base) };
  }

  /**
   * Converts an objekt from a scan result to the common fields.
   */
  export function fromScanned({ objekt }: ScannedObjekt): Objekt.Common {
    const base = {
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
    };
    return { ...base, ...deriveExtras(base) };
  }
}

/**
 * Derives the slug from the season, member, and collectionNo.
 */
function slug(
  params: Pick<Objekt.Common, "season" | "member" | "collectionNo">
): string {
  let { season, member, collectionNo } = params;
  member = member.toLowerCase().replace(/[+()]+/g, "");
  return `${season}-${member}-${collectionNo}`.toLowerCase();
}

/**
 * Derives extra fields from the objekt.
 */
function deriveExtras(
  objekt: Omit<Objekt.Common, "slug" | "artistName" | "onOffline">
): Pick<Objekt.Common, "slug" | "artistName" | "onOffline"> {
  return {
    get slug() {
      return slug({
        season: objekt.season,
        member: objekt.member,
        collectionNo: objekt.collectionNo,
      });
    },
    get artistName() {
      return artistMap[objekt.artist.toLowerCase()];
    },
    get onOffline() {
      const suffix = objekt.collectionNo.at(-1);
      if (!suffix) {
        throw new Error("Invalid collectionNo");
      }
      return onOfflineMap[suffix];
    },
  };
}

const artistMap: Record<string, string> = {
  artms: "ARTMS",
  triples: "tripleS",
};

const onOfflineMap: Record<string, "online" | "offline"> = {
  Z: "online",
  A: "offline",
};
