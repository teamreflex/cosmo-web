import {
  getArtistsWithMembers,
  getUserByIdentifier,
} from "@/app/data-fetching";
import AbstractWarning from "@/components/abstract-warning";
import Portal from "@/components/portal";
import HelpDialog from "@/components/progress/help-dialog";
import ProgressRenderer from "@/components/progress/progress-renderer";
import { ProfileProvider } from "@/hooks/use-profile";
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
  const [targetUser, artists] = await Promise.all([
    getUserByIdentifier(params.nickname),
    getArtistsWithMembers(),
  ]);

  return (
    <section className="flex flex-col gap-2">
      <AbstractWarning />

      <ProfileProvider targetProfile={targetUser.profile}>
        <ProgressRenderer
          artists={artists}
          address={targetUser.profile.address}
        />
        <Portal to="#help">
          <HelpDialog />
        </Portal>
      </ProfileProvider>
    </section>
  );
}
