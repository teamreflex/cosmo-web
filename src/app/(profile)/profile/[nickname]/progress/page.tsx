import {
  getArtistsWithMembers,
  getSelectedArtists,
  getUserByIdentifier,
} from "@/app/data-fetching";
import Portal from "@/components/portal";
import HelpDialog from "@/components/progress/help-dialog";
import ProgressRenderer from "@/components/progress/progress-renderer";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { ProfileProvider } from "@/hooks/use-profile";
import { SelectedArtistsProvider } from "@/hooks/use-selected-artists";
import { getQueryClient } from "@/lib/query-client";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
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
  const queryClient = getQueryClient();

  // prefetch filter data
  queryClient.prefetchQuery({
    queryKey: ["filter-data"],
    queryFn: fetchFilterData,
  });

  const params = await props.params;
  const [selectedArtists, targetUser] = await Promise.all([
    getSelectedArtists(),
    getUserByIdentifier(params.nickname),
  ]);

  const artists = getArtistsWithMembers();

  return (
    <section className="flex flex-col">
      <CosmoArtistProvider artists={artists}>
        <SelectedArtistsProvider selectedArtists={selectedArtists}>
          <ProfileProvider targetProfile={targetUser.profile}>
            <HydrationBoundary state={dehydrate(queryClient)}>
              <ProgressRenderer
                artists={artists}
                address={targetUser.profile.address}
              />
            </HydrationBoundary>
            <Portal to="#help">
              <HelpDialog />
            </Portal>
          </ProfileProvider>
        </SelectedArtistsProvider>
      </CosmoArtistProvider>
    </section>
  );
}
