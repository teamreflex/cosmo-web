import { Metadata } from "next";
import { Suspense, cache } from "react";
import { fetchObjektList } from "@/lib/server/objekts/lists";
import { redirect } from "next/navigation";
import ObjektListLoading from "./loading";
import {
  decodeUser,
  getProfile,
  getUserByIdentifier,
} from "@/app/data-fetching";
import ListRenderer from "@/components/lists/list-renderer";
import { fetchArtistsWithMembers } from "@/lib/server/cosmo/artists";

type Props = {
  params: {
    nickname: string;
    list: string;
  };
};

const getObjektList = cache(async (nickname: string, list: string) => {
  const profile = await getUserByIdentifier(nickname);
  return Promise.all([
    fetchObjektList(profile.address, list),
    fetchArtistsWithMembers(),
  ]);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [data] = await getObjektList(params.nickname, params.list);
  if (!data) redirect(`/@${params.nickname}`);

  return {
    title: data.name,
  };
}

export default async function ObjektListPage({ params }: Props) {
  const user = await decodeUser();
  const [currentUser, profile, [list, artists]] = await Promise.all([
    user ? getProfile(user.profileId) : undefined,
    getUserByIdentifier(params.nickname),
    getObjektList(params.nickname, params.list),
  ]);

  if (!list) redirect(`/@${params.nickname}`);

  const authenticated =
    currentUser !== undefined && currentUser.address === profile.address;

  return (
    <Suspense fallback={<ObjektListLoading />}>
      <ListRenderer
        list={list}
        artists={artists}
        authenticated={authenticated}
        user={profile}
        gridColumns={currentUser?.gridColumns}
      />
    </Suspense>
  );
}
