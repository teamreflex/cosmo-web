import CopyWallet from "@/components/my/copy-wallet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { Metadata } from "next";
import { decodeUser } from "../data-fetching";

export const runtime = "edge";
export const metadata: Metadata = {
  title: "My Page",
};

export default async function MyPage() {
  const user = await decodeUser();

  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">My Page</h1>
        </div>
      </div>

      <div className="flex flex-col gap-2 items-center py-6">
        <Avatar className="h-36 w-36">
          <AvatarFallback className="relative bg-cosmo-profile">
            <Image
              className="p-6"
              src="/profile.webp"
              fill={true}
              alt={user!.nickname}
            />
          </AvatarFallback>
          <AvatarImage src="" alt={user!.nickname} />
        </Avatar>
        <p className="font-bold text-xl">{user!.nickname}</p>
        <CopyWallet address={user!.address} />
      </div>
    </main>
  );
}
