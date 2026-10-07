import ProfileCardImage from "@/components/og/profile-card-image";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { $fetchPins } from "@/lib/functions/pins";
import { remember } from "@/lib/server/cache.server";
import { fetchFullAccount } from "@/lib/server/cosmo-accounts.server";
import { indexer } from "@/lib/server/db/indexer";
import {
  collections,
  objekts,
  transfers,
} from "@/lib/server/db/indexer/schema";
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
import { Addresses, addr, isAddress, isEqual } from "@apollo/util";
import dmSans from "@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2?inline";
import jetbrainsMono from "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?inline";
import { desc, eq, min } from "drizzle-orm";
import { render } from "takumi-js";
import { Renderer } from "takumi-js/node";
import halvar from "../../../public/HalvarBreit-Bd.woff2?inline";

/**
 * Gather everything a profile card shows: pinned objekts, or the most
 * recently received ones when nothing is pinned, plus the account's stats.
 * Undefined for the spin account, which holds millions of objekts.
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
  if (isEqual(address, Addresses.SPIN)) return undefined;

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
  const rows = await indexer
    .select({
      tokenId: objekts.id,
      slug: collections.slug,
      frontImage: collections.frontImage,
      frontImageVersion: collections.frontImageVersion,
    })
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(eq(objekts.owner, address))
    .orderBy(desc(objekts.receivedAt))
    .limit(PROFILE_CARD_MAX_OBJEKTS)
    .comment({ fn: "fetchProfileCardObjekts" });

  return rows.map((row) => ({
    tokenId: row.tokenId,
    image: getObjektFrontImageUrl(row, "thumbnail"),
  }));
}

let renderer: Promise<Renderer> | undefined;

/**
 * One renderer for the process, so fonts are parsed once and decoded images are cached between renders.
 * A failed setup is dropped so the next render retries it.
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

  renderer.catch(() => {
    renderer = undefined;
  });

  return renderer;
}

/**
 * Download each distinct objekt image once, dropping any that fail so one
 * broken image doesn't take the whole card down.
 */
async function fetchImages(cardObjekts: ProfileCardObjekt[]) {
  const results = await Promise.allSettled(
    [...new Set(cardObjekts.map((objekt) => objekt.image))].map(async (src) => {
      const response = await fetch(src, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`${response.status} ${src}`);
      return { src, data: await response.arrayBuffer() };
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
  const loaded = new Set(images.map((image) => image.src));
  const shown = card.objekts.filter((objekt) => loaded.has(objekt.image));

  return await render(
    <ProfileCardImage
      card={card}
      images={shown.map((objekt) => objekt.image)}
      placements={placeCards(
        shown.length,
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
