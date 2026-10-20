import { listingInputSchema } from "@apollo/trades/listing";
import { describe, expect, test } from "bun:test";
import {
  emptyListingForm,
  formValuesToInput,
  listingToFormValues,
} from "../src/lib/universal/trade-listing-form";
import type { TradeListing } from "../src/lib/universal/trade-listings";

const attributes = (slug: string, member: string, artist = "artms") => ({
  slug,
  artist,
  member,
  season: "Atom02",
  class: "Special",
  onOffline: "online",
});

/**
 * A stored listing as the detail payload carries it: one offered objekt, a
 * tripleS range, an exact row and a payment row only SQL can insert.
 */
const listing = {
  id: "0b7d6f1e-6a43-4c55-9d3e-2f1b4c8a9e10",
  note: "serials under 1000",
  items: [
    {
      tokenId: 4021,
      serial: 217,
      attributes: attributes("atom02-heejin-201z", "HeeJin"),
      collection: null,
    },
  ],
  wants: [
    {
      kind: "range",
      count: 5,
      filter: {
        artist: ["triples"],
        member: [],
        season: ["Atom01", "Binary01"],
        class: ["First"],
        on_offline: [],
      },
    },
    {
      kind: "exact",
      count: 1,
      objekt: attributes("atom02-kimlip-201z", "KimLip"),
      collection: null,
    },
    { kind: "payment", amount: "25.00", currency: "NZD" },
  ],
} satisfies Pick<TradeListing, "id" | "items" | "wants" | "note">;

describe("composer prefill (CMP-04)", () => {
  const values = listingToFormValues(listing);

  test("the stored terms become the form's values", () => {
    expect(values).toEqual({
      offered: [{ tokenId: 4021 }],
      wants: [
        {
          kind: "range",
          count: 5,
          filter: {
            artist: ["triples"],
            member: [],
            season: ["Atom01", "Binary01"],
            class: ["First"],
            on_offline: [],
          },
        },
        { kind: "exact", slug: "atom02-kimlip-201z", count: 1 },
      ],
      note: "serials under 1000",
    });
  });

  test("submitting unchanged sends exactly the stored terms", () => {
    const submission = formValuesToInput(listingInputSchema.parse(values), {
      kind: "edit",
      listing: { ...listing, ...fillers },
    });
    expect(submission).toEqual({
      kind: "edit",
      data: {
        listingId: listing.id,
        offered: [{ tokenId: 4021 }],
        wants: [
          {
            kind: "range",
            count: 5,
            filter: {
              artist: ["triples"],
              member: [],
              season: ["Atom01", "Binary01"],
              class: ["First"],
              on_offline: [],
            },
          },
          { kind: "exact", slug: "atom02-kimlip-201z", count: 1 },
        ],
        note: "serials under 1000",
      },
    });
  });

  test("a blank note posts as no note, and create sends no id", () => {
    const submission = formValuesToInput(
      listingInputSchema.parse({
        ...emptyListingForm,
        offered: [{ tokenId: 9 }],
        wants: [{ kind: "exact", slug: " Atom02-KimLip-201Z ", count: 2 }],
        note: "   ",
      }),
      { kind: "create" },
    );
    expect(submission).toEqual({
      kind: "create",
      data: {
        offered: [{ tokenId: 9 }],
        wants: [{ kind: "exact", slug: "atom02-kimlip-201z", count: 2 }],
        note: null,
      },
    });
  });
});

const fillers = {
  createdAt: new Date(0),
  updatedAt: new Date(0),
  poster: null,
  cosmoUsername: null,
  rep: null,
  state: { status: "open" },
  blocked: false,
} satisfies Omit<TradeListing, "id" | "items" | "wants" | "note">;
