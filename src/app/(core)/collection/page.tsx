import ObjektList from "@/components/collection/objekt-list";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const user = await readToken(cookies().get("token")?.value);
  if (!user) {
    redirect("/");
  }

  return (
    <main className="flex flex-col items-center">
      <ObjektList />
    </main>
  );
}
