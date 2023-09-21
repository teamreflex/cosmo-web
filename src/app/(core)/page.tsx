import NewsProvider from "@/components/news/news-provider";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";

export default async function HomePage() {
  const user = await readToken(cookies().get("token")?.value);

  if (!user) {
    return <span>Please login!</span>;
  }

  return (
    <main className="flex flex-col items-center">
      <NewsProvider user={user} />
    </main>
  );
}
