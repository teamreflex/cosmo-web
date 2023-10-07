import { getUser } from "@/app/api/common";
import { CosmoGridSlotCompletion, completeGrid } from "@/lib/server/cosmo";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: { grid: string } }
) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const { slots }: { slots: CosmoGridSlotCompletion[] } = await request.json();

  const success = await completeGrid(auth.user.cosmoToken, params.grid, slots);
  return NextResponse.json({ success }, { status: success ? 200 : 400 });
}
