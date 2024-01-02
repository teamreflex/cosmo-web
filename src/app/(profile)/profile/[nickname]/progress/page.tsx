import { getUserByIdentifier } from "@/app/data-fetching";
import ProgressRenderer from "@/components/progress/progress-renderer";
import { fetchArtistsWithMembers } from "@/lib/server/cosmo/artists";
import { Metadata } from "next";

type Props = {
  params: { nickname: string };
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nickname } = await getUserByIdentifier(params.nickname);

  return {
    title: `${nickname}'s Progress`,
  };
}

export default async function ProgressPage({ params }: Props) {
  const [profile, artists] = await Promise.all([
    getUserByIdentifier(params.nickname),
    fetchArtistsWithMembers(),
  ]);

  return (
    <section className="flex flex-col py-2">
      <ProgressRenderer artists={artists} address={profile.address} />
    </section>
  );
}
