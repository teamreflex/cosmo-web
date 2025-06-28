import { type NextRequest, NextResponse } from "next/server";
import { parseUserCollectionGroups } from "@/lib/universal/parsers";
import { fetchObjektsBlockchainGroups } from "@/lib/server/objekts/prefetching/objekt-blockchain-groups";
import { Addresses, isEqual } from "@/lib/utils";

type Props = {
  params: Promise<{
    address: string;
  }>;
};

export async function GET(request: NextRequest, props: Props) {
  const { address } = await props.params;

  // prevent collection groups being used on the spin account
  if (isEqual(address, Addresses.SPIN)) {
    return NextResponse.json({
      collectionCount: 0,
      collections: [],
    });
  }

  const filters = parseUserCollectionGroups(request.nextUrl.searchParams);

  try {
    const response = await fetchObjektsBlockchainGroups(address, filters);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching collection groups:", error);
    return NextResponse.json({
      collectionCount: 0,
      collections: [],
    });
  }
}
