import { getUser } from "@/app/api/common";
import { ownedBy } from "@/lib/server/cosmo";
import { NextRequest, NextResponse } from "next/server";
import { validateCollectionParams } from "@/lib/universal";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  const auth = await getUser();
  const accessToken = auth.success ? auth.user?.accessToken : undefined;

  const objekts = await ownedBy({
    token: accessToken,
    address: params.address,
    ...validateCollectionParams(request.nextUrl.searchParams),
  });

  return NextResponse.json(objekts, { status: 200 });
}
