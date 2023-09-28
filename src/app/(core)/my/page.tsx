import CopyWallet from "@/components/my/copy-wallet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import ProfileImage from "@/static/profile.webp";

export const runtime = "edge";

export default async function MyPage() {
  const user = await readToken(cookies().get("token")?.value);

  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">My Page</h1>
        </div>
      </div>

      <div className="flex flex-col gap-2 items-center py-6">
        <Avatar className="h-36 w-36">
          <AvatarFallback className="relative bg-violet-100">
            <Image
              className="p-6"
              src={ProfileImage}
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
