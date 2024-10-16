import MyRekords from "@/components/rekord/my-rekords";
import { getSelectedArtist } from "@/lib/server/profiles";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Rekord",
};

export default async function MyRekordPage() {
  const artist = await getSelectedArtist();

  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">My Rekord</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 py-2 w-full">
        <MyRekords artist={artist} />
      </div>
    </main>
  );
}
