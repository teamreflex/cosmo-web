import { Metadata } from "next";
import TransfersRenderer from "@/components/transfers/transfers-renderer";
import { decodeUser, getUserByIdentifier } from "@/app/data-fetching";
import { Shield } from "lucide-react";
import { isAddressEqual } from "@/lib/utils";
import { getQueryClient } from "@/lib/query-client";
import { transfersQuery } from "@/components/transfers/queries";
import { fetchTransfers } from "@/lib/server/transfers";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

type Props = {
  params: Promise<{ nickname: string }>;
};
export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { profile } = await getUserByIdentifier(params.nickname);

  return {
    title: `${profile.nickname}'s Trades`,
  };
}

export default async function UserTransfersPage(props: Props) {
  const params = await props.params;
  const user = await decodeUser();
  const { profile } = await getUserByIdentifier(params.nickname);
  if (
    profile.privacy.trades &&
    !isAddressEqual(user?.address, profile.address)
  ) {
    return <Private nickname={profile.nickname} />;
  }

  // prefetch transfers
  const queryClient = getQueryClient();
  queryClient.prefetchInfiniteQuery({
    ...transfersQuery(profile.address),
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
      return fetchTransfers(profile.address, pageParam);
    },
  });

  return (
    <section className="flex flex-col">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <TransfersRenderer profile={profile} />
      </HydrationBoundary>

      <div id="pagination" />
    </section>
  );
}

function Private({ nickname }: { nickname: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <Shield className="w-12 h-12" />
      <p className="text-sm font-semibold">
        {nickname}&apos;s trades are private
      </p>
    </div>
  );
}
