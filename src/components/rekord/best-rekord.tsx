import { ValidArtist } from "@/lib/universal/cosmo/common";
import { decodeUser } from "@/app/data-fetching";
import { fetchTopPosts } from "@/lib/server/cosmo/rekord";
import BestRekordCarousel from "./best-rekord-carousel";

type Props = {
  artist: ValidArtist;
};

export default async function BestRekord({ artist }: Props) {
  const user = await decodeUser();
  const topPosts = await fetchTopPosts(user!.accessToken, artist);

  return <BestRekordCarousel posts={topPosts} />;
}
