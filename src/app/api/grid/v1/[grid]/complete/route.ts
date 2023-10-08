import { getUser } from "@/app/api/common";
import { env } from "@/env.mjs";
import { CosmoGridSlotCompletion, completeGrid } from "@/lib/server/cosmo";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(
  request: NextRequest,
  { params }: { params: { grid: string } }
) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  // dev: simulate grid completion
  if (env.NEXT_PUBLIC_SIMULATE_GRID) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const { slots }: { slots: CosmoGridSlotCompletion[] } = await request.json();

  const success = await completeGrid(auth.user.cosmoToken, params.grid, slots);
  return NextResponse.json({ success }, { status: success ? 200 : 400 });
}
