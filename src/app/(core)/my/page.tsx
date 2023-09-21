import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function MyPage() {
  const user = await readToken(cookies().get("token")?.value);
  if (!user) {
    redirect("/");
  }

  return (
    <main className="flex flex-col items-center p-2">{user.nickname}</main>
  );
}
