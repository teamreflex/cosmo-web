import { getUser } from "@/app/api/common";
import { claimGridReward } from "@/lib/server/cosmo";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  _: Request,
  { params }: { params: { grid: string } }
) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const result = await claimGridReward(auth.user.cosmoToken, params.grid);
  return NextResponse.json(result);
}
