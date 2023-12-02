import { Metadata } from "next";
import { Suspense, cache } from "react";
import { fetchObjektListForUser } from "@/lib/server/objekts/lists";
import { notFound, redirect } from "next/navigation";
import ObjektListLoading from "./loading";
import { search } from "@/lib/server/cosmo/auth";
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
  Promise.all([
    search(nickname),
    fetchObjektListForUser(nickname, list),
    cacheMembers(),
  ])
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [users, list] = await fetchData(params.nickname, params.list);
  const user = users.find(
    (u) => u.nickname.toLowerCase() === params.nickname.toLowerCase()
  );
  if (!user || !list) notFound();
  if (!list) redirect(`/@${params.nickname}`);

  return {
    title: list.name,
  };
}

export default async function ObjektListPage({ params }: Props) {
  const [users, list, artists] = await fetchData(params.nickname, params.list);
  const user = users.find(
    (u) => u.nickname.toLowerCase() === params.nickname.toLowerCase()
  );
  if (!user || !list) notFound();
  if (!list) redirect(`/@${params.nickname}`);

  const currentUser = await decodeUser();
  const authenticated =
    currentUser !== undefined && currentUser.address === user.address;

  return (
    <Suspense fallback={<ObjektListLoading />}>
      <ListRenderer
        list={list}
        artists={artists}
        authenticated={authenticated}
        user={user}
      />
    </Suspense>
  );
}
