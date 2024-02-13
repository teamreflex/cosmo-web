import { decodeUser, getProfile } from "@/app/data-fetching";
import MyRekords from "@/components/rekord/my-rekords";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Rekord",
};

export default async function MyRekordPage() {
  const user = await decodeUser();
  const profile = await getProfile(user!.profileId);

  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">My Rekord</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 py-2 w-full">
        <MyRekords artist={profile.artist} />
      </div>
    </main>
  );
}
