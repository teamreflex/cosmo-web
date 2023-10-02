import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { Suspense } from "react";
import CosmoImage from "@/static/cosmo.png";
import Image from "next/image";
import NewsRenderer from "@/components/news/news-renderer";
import { LoadingNews } from "@/components/news/news-loading";
import { fetchSelectedArtist } from "./data-fetching";

export const runtime = "edge";

export default async function HomePage() {
  const user = await readToken(cookies().get("token")?.value);

  if (!user) {
    return (
      <span className="flex flex-col justify-center items-center w-full gap-2 py-12">
        <Image src={CosmoImage} width={100} height={100} alt="Cosmo" />
        <span className="font-semibold text-lg">
          Welcome to <span className="font-cosmo">COSMO</span>
          <p className="text-sm text-center">Please sign in</p>
        </span>
      </span>
    );
  }

  const selectedArtist = await fetchSelectedArtist(user.id);

  return (
    <main className="flex flex-col items-center container">
      <Suspense fallback={<LoadingNews />}>
        <NewsRenderer user={user!} artist={selectedArtist ?? "artms"} />
      </Suspense>
    </main>
  );
}
