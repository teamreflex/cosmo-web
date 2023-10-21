import { getUser } from "@/app/api/common";
import { env } from "@/env.mjs";
import { claimGridReward } from "@/lib/server/cosmo";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(
  _: Request,
  { params }: { params: { grid: string } }
) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  // dev: simulate grid completion
  if (env.NEXT_PUBLIC_SIMULATE_GRID) {
    return NextResponse.json({
      objekt: {
        collectionId: "Atom01 JinSoul 201Z",
        season: "Atom01",
        member: "JinSoul",
        collectionNo: "201Z",
        class: "Special",
        artists: ["artms"],
        thumbnailImage:
          "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/543842fc-da51-429f-b095-6b429484e500/thumbnail",
        frontImage:
          "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/543842fc-da51-429f-b095-6b429484e500/4x",
        backImage:
          "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/9aa7fc9d-976b-49ba-89ae-85d53333df00/4x",
        accentColor: "#F7F7F7",
        backgroundColor: "#F7F7F7",
        textColor: "#000000",
        comoAmount: 1,
        transferableByDefault: true,
        tokenId: "1252359",
        tokenAddress: "0x0fB69F54bA90f17578a59823E09e5a1f8F3FA200",
        objektNo: 21,
        transferable: true,
      },
      transaction: {
        txId: "",
        chainId: "",
        ref: "",
      },
    });
  }

  const result = await claimGridReward(auth.user.accessToken, params.grid);
  return NextResponse.json(result);
}
