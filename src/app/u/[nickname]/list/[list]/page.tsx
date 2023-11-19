import { Metadata } from "next";
import { Suspense, cache } from "react";
import { fetchObjektList } from "@/lib/server/objekts";
import { notFound, redirect } from "next/navigation";
import ObjektListLoading from "./loading";
import { search } from "@/lib/server/cosmo";
import { cacheMembers } from "@/lib/server/cache";
import { decodeUser } from "@/app/data-fetching";
import ListRenderer from "@/components/lists/list-renderer";

export const runtime = "nodejs";

type Props = {
  params: {
    nickname: string;
    list: string;
  };
};

const fetchData = cache((nickname: string, list: string) =>
  Promise.all([search(nickname), fetchObjektList(list), cacheMembers()])
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [users, list] = await fetchData(params.nickname, params.list);
  const user = users.find(
    (u) => u.nickname.toLowerCase() === params.nickname.toLowerCase()
  );
  if (!user) notFound();
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
  if (!user) notFound();
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
        user={user.nickname}
      />
    </Suspense>
  );
}
