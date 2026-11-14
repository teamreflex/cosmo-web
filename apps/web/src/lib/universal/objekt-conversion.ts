import type { Objekt as ObjektRow } from "@apollo/database/indexer/types";
import { slugifyObjekt } from "@apollo/util";

export namespace Objekt {
  /**
   * Collection related fields.
   */
  export type Collection = {
    // comes directly from metadata
    /** diverges from cosmo api */
    id: string;
    // the artist's id lowercased, as the indexer stores it
    artist: string;
    member: string;
    season: string;
    class: string;
    collectionNo: string;
    collectionId: string;
    frontImage: string;
    backImage: string;
    /** version of the image mirrored into apollo's CDN, null until mirrored */
    frontImageVersion: string | null;
    backImageVersion: string | null;
    backgroundColor: string;
    textColor: string;
    bandImageUrl: string | null;
    frontMedia: string | null;
    hasAudio: boolean;
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
    acquiredAt: string;
    nonTransferableReason?: NonTransferableReason;
  };

  export type Objekt = {
    collection: Collection;
    objekt: Token;
  };

  /**
   * Every copy of one collection that an address owns.
   */
  export type Group = {
    collection: Collection;
    objekts: Token[];
  };

  /**
   * Converts a collection from the indexer, or its search document, to the
   * common fields.
   */
  export function fromIndexer(objekt: CollectionFields): Objekt.Collection {
    const collection = {
      id: objekt.id,
      artist: objekt.artist.toLowerCase(),
      member: objekt.member,
      season: objekt.season,
      class: objekt.class,
      collectionNo: objekt.collectionNo,
      collectionId: objekt.collectionId,
      frontImage: objekt.frontImage,
      backImage: objekt.backImage,
      frontImageVersion: objekt.frontImageVersion,
      backImageVersion: objekt.backImageVersion,
      backgroundColor: objekt.backgroundColor,
      textColor: objekt.textColor,
      bandImageUrl: objekt.bandImageUrl,
      frontMedia: objekt.frontMedia,
      hasAudio: objekt.hasAudio,
    };

    return { ...collection, ...deriveExtras(collection) };
  }

  /**
   * Converts an objekt row from the indexer to the token fields. The class is
   * its collection's.
   */
  export function tokenFromRow(
    objekt: TokenRow,
    className: string,
  ): Objekt.Token {
    return {
      serial: objekt.serial,
      tokenId: Number(objekt.id),
      transferable: objekt.transferable,
      acquiredAt: objekt.receivedAt,
      nonTransferableReason: nonTransferableReason(
        className,
        objekt.transferable,
      ),
    };
  }

  /**
   * Converts an objekt row and its collection row from the indexer to the
   * common fields.
   */
  export function fromRow(
    objekt: TokenRow,
    collection: CollectionFields,
  ): Objekt.Objekt {
    return {
      collection: fromIndexer(collection),
      objekt: tokenFromRow(objekt, collection.class),
    };
  }
}

/**
 * The fields of a collection that are stored, which an indexer row and its
 * search document both hold.
 */
type CollectionFields = Omit<
  Objekt.Collection,
  "slug" | "artistName" | "onOffline"
>;

type TokenRow = Pick<
  ObjektRow,
  "id" | "serial" | "transferable" | "receivedAt"
>;

export type NonTransferableReason = "welcome-objekt" | "not-transferable";

/**
 * Why an objekt can't be sent, from its collection's class and the indexer's
 * transferable flag. Undefined when it can.
 */
export function nonTransferableReason(
  className: string,
  transferable: boolean,
): NonTransferableReason | undefined {
  if (className === "Welcome") {
    return "welcome-objekt";
  }

  return transferable === false ? "not-transferable" : undefined;
}

type DerivedExtras = Pick<
  Objekt.Collection,
  "slug" | "artistName" | "onOffline"
> &
  ColorFixes;

/**
 * Derives extra fields from the objekt.
 */
function deriveExtras(objekt: CollectionFields): DerivedExtras {
  const slug = slugifyObjekt(objekt.collectionId);

  return {
    get slug() {
      return slug;
    },
    get artistName() {
      return artistMap.get(objekt.artist.toLowerCase()) ?? "";
    },
    get onOffline() {
      const suffix = objekt.collectionNo.at(-1);
      if (!suffix) {
        throw new Error("Invalid collectionNo");
      }
      return onOfflineMap.get(suffix) ?? "online";
    },
    ...colorFixes.get(slug),
  };
}

const artistMap = new Map([
  ["artms", "ARTMS"],
  ["triples", "tripleS"],
  ["idntt", "idntt"],
]);

/**
 * An artist's display name ("ARTMS") from its id in any casing, or the id
 * itself when it isn't a known artist.
 */
export function artistName(artist: string) {
  return artistMap.get(artist.toLowerCase()) ?? artist;
}

const onOfflineMap = new Map<string, "online" | "offline">([
  ["Z", "online"],
  ["A", "offline"],
]);

type ColorFixes = Partial<
  Pick<Objekt.Collection, "backgroundColor" | "textColor">
>;

/**
 * COSMO doesn't use the objekt background color,
 * so sometimes they're incorrect and need manually fixing.
 */
export const colorFixes = new Map<string, ColorFixes>([
  // Heejin <K> MMT POBs: fix text color
  ["atom01-heejin-322z", { textColor: "#FFFFFF" }],
  ["atom01-heejin-323z", { textColor: "#FFFFFF" }],
  ["atom01-heejin-324z", { textColor: "#FFFFFF" }],
  ["atom01-heejin-325z", { textColor: "#FFFFFF" }],
  // Choerry Binary01 grids: fix background color
  ["binary01-choerry-201z", { backgroundColor: "#FFFFFF" }],
  ["binary01-choerry-202z", { backgroundColor: "#FFFFFF" }],
  // Dahyun Cream grids: fix background color
  ["cream01-dahyun-203z", { backgroundColor: "#FFFFFF" }],
  ["cream01-dahyun-204z", { backgroundColor: "#FFFFFF" }],
  // Seoyeon Divine01 3rd edition: fix background color
  ["divine01-seoyeon-117z", { backgroundColor: "#B400FF" }],
  ["divine01-seoyeon-118z", { backgroundColor: "#B400FF" }],
  ["divine01-seoyeon-119z", { backgroundColor: "#B400FF" }],
  ["divine01-seoyeon-120z", { backgroundColor: "#B400FF" }],
  // Seoyeon Everline A24 POB: fix background color
  ["divine01-seoyeon-317z", { backgroundColor: "#df2e37" }],
  // Seoyeon Assemble 2nd anniversary: fix text color
  ["ever01-seoyeon-338z", { textColor: "#07328D" }],
]);
