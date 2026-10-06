import ProfileCardImage from "@/components/og/profile-card-image";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { $fetchPins } from "@/lib/functions/pins";
import { remember } from "@/lib/server/cache.server";
import { fetchFullAccount } from "@/lib/server/cosmo-accounts.server";
import { indexer } from "@/lib/server/db/indexer";
import { objekts, transfers } from "@/lib/server/db/indexer/schema";
import { profileIdentifier } from "@/lib/universal/cosmo-accounts";
import { Objekt } from "@/lib/universal/objekt-conversion";
import {
  PROFILE_CARD_FONTS,
  PROFILE_CARD_HEIGHT,
  PROFILE_CARD_MAX_OBJEKTS,
  PROFILE_CARD_WIDTH,
  cardSeed,
  placeCards,
} from "@/lib/universal/profile-card";
import type {
  ProfileCard,
  ProfileCardObjekt,
} from "@/lib/universal/profile-card";
import { addr, isAddress } from "@apollo/util";
import dmSans from "@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2?inline";
import jetbrainsMono from "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?inline";
import { eq, min } from "drizzle-orm";
import { render } from "takumi-js";
import { Renderer } from "takumi-js/node";
import halvar from "../../../public/HalvarBreit-Bd.woff2?inline";

/**
 * Gather everything a profile card shows: pinned objekts, or the most
 * recently received ones when nothing is pinned, plus the account's stats.
 * Count: cached for 24 hours
 * Join date: cached for 7 days
 */
export async function fetchProfileCard(
  identifier: string,
  signal?: AbortSignal,
): Promise<ProfileCard | undefined> {
  const account = await fetchFullAccount(identifier, signal);
  if (account === undefined) return undefined;

  const address = addr(account.cosmo.address);
  const [cardObjekts, objektCount, since] = await Promise.all([
    fetchCardObjekts(identifier, address),
    remember(`objekt-count:v1:${address}`, 60 * 60 * 24, () =>
      indexer.$count(objekts, eq(objekts.owner, address)),
    ),
    remember(`first-transfer:v1:${address}`, 60 * 60 * 24 * 7, async () => {
      const [row] = await indexer
        .select({ at: min(transfers.timestamp) })
        .from(transfers)
        .where(eq(transfers.to, address));
      return row?.at ?? null;
    }),
  ]);

  const name = profileIdentifier(account.cosmo);
  return {
    name,
    isAddress: isAddress(name),
    objekts: cardObjekts,
    objektCount,
    since,
  };
}

/**
 * Pinned objekts in pin order, falling back to the latest received.
 */
async function fetchCardObjekts(
  identifier: string,
  address: string,
): Promise<ProfileCardObjekt[]> {
  const pins = await $fetchPins({ data: { username: identifier } });
  const pinned = pins.flatMap((pin) =>
    pin.kind === "objekt"
      ? [
          {
            tokenId: pin.objekt.tokenId,
            image: getObjektFrontImageUrl(
              Objekt.fromLegacy(pin.objekt).collection,
              "thumbnail",
            ),
          },
        ]
      : [],
  );
  if (pinned.length > 0) return pinned.slice(0, PROFILE_CARD_MAX_OBJEKTS);

  // no pins, falling back to latest objekts
  const recent = await indexer.query.objekts.findMany({
    where: { owner: address },
    orderBy: { receivedAt: "desc" },
    limit: PROFILE_CARD_MAX_OBJEKTS,
    columns: { id: true },
    with: {
      collection: {
        columns: { slug: true, frontImage: true, frontImageVersion: true },
      },
    },
  });

  return recent.map((objekt) => ({
    tokenId: objekt.id,
    image: getObjektFrontImageUrl(objekt.collection, "thumbnail"),
  }));
}

let renderer: Promise<Renderer> | undefined;

/**
 * One renderer for the process, so fonts are parsed once and decoded images
 * are cached between renders.
 */
function getRenderer() {
  renderer ??= (async () => {
    const instance = new Renderer();
    const fonts = [
      { name: PROFILE_CARD_FONTS.display, uri: halvar },
      { name: PROFILE_CARD_FONTS.body, uri: dmSans },
      { name: PROFILE_CARD_FONTS.mono, uri: jetbrainsMono },
    ];
    for (const font of fonts) {
      const data = await (await fetch(font.uri)).arrayBuffer();
      await instance.registerFont({ name: font.name, data });
    }
    return instance;
  })();
  return renderer;
}

/**
 * Download each objekt image, dropping any that fail so one broken image
 * doesn't take the whole card down.
 */
async function fetchImages(cardObjekts: ProfileCardObjekt[]) {
  const results = await Promise.allSettled(
    cardObjekts.map(async (objekt) => {
      const response = await fetch(objekt.image, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`${response.status} ${objekt.image}`);
      return { src: objekt.image, data: await response.arrayBuffer() };
    }),
  );
  return results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
}

/**
 * Render a profile card to JPEG; it has no transparency, and PNG is about 5x the size.
 */
export async function renderProfileCard(card: ProfileCard) {
  const images = await fetchImages(card.objekts);

  return await render(
    <ProfileCardImage
      card={card}
      images={images.map((image) => image.src)}
      placements={placeCards(
        images.length,
        cardSeed(card.objekts.map((objekt) => objekt.tokenId)),
      )}
    />,
    {
      renderer: await getRenderer(),
      width: PROFILE_CARD_WIDTH,
      height: PROFILE_CARD_HEIGHT,
      format: "jpeg",
      quality: 85,
      images,
      jsx: { tailwindClassesProperty: "className" },
    },
  );
}
