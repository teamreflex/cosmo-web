import {
  decodeUser,
  getArtistsWithMembers,
  getUserByIdentifier,
} from "@/app/data-fetching";
import Portal from "@/components/portal";
import HelpDialog from "@/components/progress/help-dialog";
import ProgressRenderer from "@/components/progress/progress-renderer";
import { ProfileProvider } from "@/hooks/use-profile";
import { isAddressEqual } from "@/lib/utils";
import { Shield } from "lucide-react";
import { Metadata } from "next";

type Props = {
  params: Promise<{ nickname: string }>;
};
export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { profile } = await getUserByIdentifier(params.nickname);

  return {
    title: `${profile.nickname}'s Progress`,
  };
}

export default async function ProgressPage(props: Props) {
  const params = await props.params;
  const [currentUser, targetUser, artists] = await Promise.all([
    decodeUser(),
    getUserByIdentifier(params.nickname),
    getArtistsWithMembers(),
  ]);

  const { profile } = targetUser;

  const showProgress =
    profile.privacy.objekts === false ||
    isAddressEqual(currentUser?.address, profile.address);

  if (showProgress === false) {
    return <Private nickname={profile.nickname} />;
  }

  return (
    <section className="flex flex-col">
      <ProfileProvider targetProfile={profile}>
        <ProgressRenderer artists={artists} address={profile.address} />
        <Portal to="#help">
          <HelpDialog />
        </Portal>
      </ProfileProvider>
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
