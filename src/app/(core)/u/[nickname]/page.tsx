import { Metadata } from "next";
import { Suspense } from "react";
import UserCollectionRenderer from "@/components/user-collection/user-collection-renderer";
import { search } from "@/lib/server/cosmo";
import { notFound } from "next/navigation";
import OtherCollectionLoading from "./loading";

export const runtime = "edge";

type Props = {
  params: { nickname: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `${params.nickname}'s Collection`,
  };
}

export default async function OtherCollectionPage({ params }: Props) {
  const result = await search(params.nickname);
  const user = result.find(
    (u) => u.nickname.toLowerCase() === params.nickname.toLowerCase()
  );

  if (!user) notFound();

  return (
    <Suspense fallback={<OtherCollectionLoading />}>
      <UserCollectionRenderer nickname={user.nickname} address={user.address} />
    </Suspense>
  );
}
