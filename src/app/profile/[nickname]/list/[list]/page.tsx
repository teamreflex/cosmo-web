import { Metadata } from "next";
import { Suspense, cache } from "react";
import { fetchObjektList } from "@/lib/server/objekts/lists";
import { redirect } from "next/navigation";
import ObjektListLoading from "./loading";
import { cacheMembers } from "@/lib/server/cache/available-artists";
import { decodeUser, getUserByIdentifier } from "@/app/data-fetching";
import ListRenderer from "@/components/lists/list-renderer";

type Props = {
  params: {
    nickname: string;
    list: string;
  };
};

const getObjektList = cache(async (nickname: string, list: string) => {
  const profile = await getUserByIdentifier(nickname);
  return Promise.all([fetchObjektList(profile.address, list), cacheMembers()]);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [data] = await getObjektList(params.nickname, params.list);
  if (!data) redirect(`/@${params.nickname}`);

  return {
    title: data.name,
  };
}

export default async function ObjektListPage({ params }: Props) {
  const profile = await getUserByIdentifier(params.nickname);
  const [list, artists] = await getObjektList(params.nickname, params.list);
  if (!list) redirect(`/@${params.nickname}`);

  const currentUser = await decodeUser();
  const authenticated =
    currentUser !== undefined && currentUser.address === profile.address;

  return (
    <Suspense fallback={<ObjektListLoading />}>
      <ListRenderer
        list={list}
        artists={artists}
        authenticated={authenticated}
        user={profile}
      />
    </Suspense>
  );
}
