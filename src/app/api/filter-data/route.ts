import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { NextResponse } from "next/server";

export async function GET() {
  const data = await fetchFilterData();
  return NextResponse.json(data);
}
