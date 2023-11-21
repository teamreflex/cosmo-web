import { Metadata } from "next";
import { decodeUser } from "../data-fetching";
import { cacheArtists } from "@/lib/server/cache";
import { fetchSpecialTransfers } from "@/lib/server/como";
import ComoCalendar from "@/components/como/calendar";
import CurrentMonth from "@/components/como/current-month";
import HelpDialog from "@/components/como/help-dialog";

export const runtime = "nodejs";
export const metadata: Metadata = {
  title: "COMO Calendar",
};

export default async function ComoPage() {
  const user = await decodeUser();

  const [artists, transfers] = await Promise.all([
    cacheArtists(),
    fetchSpecialTransfers(user!.address),
  ]);

  return (
    <main className="container flex flex-col gap-2 py-2">
      <div className="flex items-center">
        <div className="flex w-full gap-2 justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-cosmo uppercase">COMO</h1>
            <HelpDialog />
          </div>

          <CurrentMonth />
        </div>
      </div>

      <ComoCalendar artists={artists} transfers={transfers} />
    </main>
  );
}
