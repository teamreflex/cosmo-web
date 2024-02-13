import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rekord Archive",
};

export default async function RekordArchivePage() {
  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">Rekord Archive</h1>
        </div>
      </div>

      <div className="flex flex-col gap-2 items-center py-6">
        <p className="text-center">coming soon</p>
      </div>
    </main>
  );
}
