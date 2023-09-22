import NewsContainer from "@/components/news/news-container";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";

export default async function HomePage() {
  const user = await readToken(cookies().get("token")?.value);

  if (!user) {
    return (
      <span className="flex justify-center w-full py-12">Please login!</span>
    );
  }

  return (
    <main className="flex flex-col items-center">
      <NewsContainer user={user} />
    </main>
  );
}
