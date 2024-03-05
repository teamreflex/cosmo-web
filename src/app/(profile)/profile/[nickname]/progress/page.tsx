import { decodeUser, getUserByIdentifier } from "@/app/data-fetching";
import Portal from "@/components/portal";
import HelpDialog from "@/components/progress/help-dialog";
import ProgressRenderer from "@/components/progress/progress-renderer";
import { fetchArtistsWithMembers } from "@/lib/server/cosmo/artists";
import { addrcomp } from "@/lib/utils";
import { Shield } from "lucide-react";
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

  const currentUser = await decodeUser();
  const showProgress =
    profile.privacy.objekts === false ||
    addrcomp(currentUser?.address, profile.address);

  if (showProgress === false) {
    return <Private nickname={profile.nickname} />;
  }

  return (
    <section className="flex flex-col py-2">
      <ProgressRenderer artists={artists} address={profile.address} />
      <Portal to="#help">
        <HelpDialog />
      </Portal>
    </section>
  );
}

function Private({ nickname }: { nickname: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <Shield className="w-12 h-12" />
      <p className="text-sm font-semibold">
        {nickname}&apos;s progress is private
      </p>
    </div>
  );
}
