import { Metadata } from "next";
import { Suspense, cache } from "react";
import { fetchObjektListWithUser } from "@/lib/server/objekts/lists";
import { redirect } from "next/navigation";
import ObjektListLoading from "./loading";
import { cacheMembers } from "@/lib/server/cache/available-artists";
import { decodeUser } from "@/app/data-fetching";
import ListRenderer from "@/components/lists/list-renderer";

type Props = {
  params: {
    nickname: string;
    list: string;
  };
};

const fetchData = cache((nickname: string, list: string) =>
  Promise.all([fetchObjektListWithUser(nickname, list), cacheMembers()])
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [data] = await fetchData(params.nickname, params.list);
  if (!data) redirect(`/@${params.nickname}`);

  return {
    title: data.list.name,
  };
}

export default async function ObjektListPage({ params }: Props) {
  const [data, artists] = await fetchData(params.nickname, params.list);
  if (!data) redirect(`/@${params.nickname}`);

  const currentUser = await decodeUser();
  const authenticated =
    currentUser !== undefined && currentUser.address === data.user.address;

  return (
    <Suspense fallback={<ObjektListLoading />}>
      <ListRenderer
        list={data.list}
        artists={artists}
        authenticated={authenticated}
        user={data.user}
      />
    </Suspense>
  );
}
