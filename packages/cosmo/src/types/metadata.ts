export type CosmoObjektMetadataV1 = {
  name: string;
  description: string;
  image: string;
  background_color: string;
  objekt: {
    collectionId: string;
    season: string;
    member: string;
    collectionNo: string;
    class: string;
    artists: string[];
    thumbnailImage: string;
    frontImage: string;
    backImage: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    comoAmount: number;
    tokenId: string;
    objektNo: number;
    tokenAddress: string;
    transferable: boolean;
  };
};

export type CosmoObjektMetadataV3 = {
  name: string;
  description: string;
  image: string;
  background_color: string;
  attributes: {
    trait_type: string;
    value: string;
  }[];
};

/**
 * Attempt to convert v3 metadata to v1 metadata.
 */
export function normalizeV3(
  metadata: CosmoObjektMetadataV3,
  tokenId: string,
): CosmoObjektMetadataV1 {
  const artist = getTrait(metadata, tokenId, "Artist");
  const className = getTrait(metadata, tokenId, "Class");
  const member = getTrait(metadata, tokenId, "Member");
  const season = getTrait(metadata, tokenId, "Season");
  const collection = getTrait(metadata, tokenId, "Collection");

  const thumbnail = metadata.image.replace(/\/(4x|original)/, "/thumbnail");
  const comoAmount = ["Double", "Premier"].includes(className) ? 2 : 1;

  return {
    name: metadata.name,
    description: metadata.description,
    image: metadata.image,
    background_color: metadata.background_color,
    objekt: {
      collectionId: `${season}-${member}-${collection}`,
      season: season,
      member: member,
      collectionNo: collection,
      class: className,
      artists: [artist.toLowerCase()],
      thumbnailImage: thumbnail,
      frontImage: metadata.image,
      backgroundColor: metadata.background_color,
      comoAmount: comoAmount,
      tokenId: tokenId,
      // not possible to get from v3
      backImage: "",
      accentColor: "",
      textColor: "#000000",
      objektNo: 0,
      tokenAddress: "",
      transferable: false,
    },
  };
}

/**
 * Get a trait from the metadata attributes array.
 */
function getTrait(
  metadata: CosmoObjektMetadataV3,
  tokenId: string,
  trait: string,
) {
  const attr = metadata.attributes.find((attr, _, arr) => {
    // special case for unit objekts
    if (
      trait === "Member" &&
      arr.findIndex((a) => a.trait_type === "Class" && a.value === "Unit") > -1
    ) {
      return attr.value.includes(" x ");
    }

    return attr.trait_type === trait;
  });
  if (!attr) {
    throw new Error(
      `[normalizeV3] Trait ${trait} not found for token ${tokenId}`,
    );
  }
  return attr.value;
}
