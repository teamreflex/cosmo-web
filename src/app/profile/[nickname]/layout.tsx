import { getUserByIdentifier } from "@/app/data-fetching";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  params: {
    nickname: string;
  };
}>;

export default async function ProfileLayout({ children, params }: Props) {
  const profile = await getUserByIdentifier(params.nickname);

  return (
    <main className="container flex flex-col py-2">
      <h1 className="text-3xl font-cosmo font-bold">{profile.nickname}</h1>

      {children}
    </main>
  );
}
