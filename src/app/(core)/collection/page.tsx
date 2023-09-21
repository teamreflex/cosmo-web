import ObjektList from "@/components/collection/objekt-list";
import { OwnedObjektsSearchParams, ownedByMe } from "@/lib/server/cosmo";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: OwnedObjektsSearchParams;
};

export default async function CollectionPage({ searchParams }: Props) {
  const user = await readToken(cookies().get("token")?.value);
  if (!user) {
    redirect("/");
  }

  const result = await ownedByMe({
    token: user!.cosmoToken,
    startAfter: searchParams.startAfter ?? 0,
    member: searchParams.member,
    artist: searchParams.artist,
    sort: searchParams.sort ?? "newest",
  });

  return (
    <main className="flex flex-col items-center py-2">
      <ObjektList objekts={result.objekts} />
    </main>
  );
}
