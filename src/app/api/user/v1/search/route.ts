import { getUser } from "@/app/api/common";
import { search } from "@/lib/server/cosmo";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const params = request.nextUrl.searchParams;
  const query = params.get("query");
  if (!query) {
    return NextResponse.json([]);
  }

  const results = await search(query);
  return NextResponse.json(results);
}
