import {
  getArtistsWithMembers,
  getSelectedArtists,
  getUserByIdentifier,
  getUserOrProfile,
} from "@/app/data-fetching";
import Portal from "@/components/portal";
import AddressFallback from "@/components/profile/address-fallback";
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
  const user = await getUserOrProfile(params.nickname);

  return {
    title: `${user.username}'s Progress`,
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
  const [artists, selectedArtists, targetUser] = await Promise.all([
    getArtistsWithMembers(),
    getSelectedArtists(),
    getUserOrProfile(params.nickname),
  ]);

  if (!targetUser.cosmoAddress) {
    return <AddressFallback username={targetUser.username} />;
  }

  return (
    <section className="flex flex-col">
      <CosmoArtistProvider artists={artists}>
        <SelectedArtistsProvider selected={selectedArtists}>
          <ProfileProvider targetUser={targetUser}>
            <HydrationBoundary state={dehydrate(queryClient)}>
              <ProgressRenderer address={targetUser.cosmoAddress} />
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
