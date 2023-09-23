import ObjektList from "@/components/collection/objekt-list";
import { fetchLockedObjekts } from "@/lib/server/cache";
import { fetchArtist } from "@/lib/server/cosmo";
import { validArtists } from "@/lib/server/cosmo/common";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const fetchData = cache(
  async (userId: number) =>
    await Promise.all([
      fetchLockedObjekts(userId),
      ...validArtists.map((artist) => fetchArtist(artist)),
    ])
);

export default async function CollectionPage() {
  const user = await readToken(cookies().get("token")?.value);
  if (!user) {
    redirect("/");
  }

  const [lockedObjekts, ...artists] = await fetchData(user.id);

  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-2xl font-cosmo uppercase">Collect</h1>
          <AlertDialog>
            <AlertDialogTrigger>
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Info</AlertDialogTitle>
                <AlertDialogDescription>
                  Locking an objekt does not affect usage within the Cosmo app.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction>Understood</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <ObjektList locked={lockedObjekts} artists={artists} />
    </main>
  );
}
