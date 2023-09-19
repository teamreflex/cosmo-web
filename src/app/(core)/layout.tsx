import type { Metadata } from "next";
import { ProviderHelper } from "@/components/provider";
import Navbar from "@/components/navbar";
import { cookies } from "next/headers";
import { readToken } from "@/lib/server/jwt";

export const metadata: Metadata = {
  title: "Cosmo",
  description: "Cosmo",
};

export default async function CoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await readToken(cookies().get("token")?.value);

  return (
    <ProviderHelper user={user!}>
      <div className="max-w-screen h-screen">
        <Navbar user={user!} />

        {/* content */}
        <div className="m-auto mb-5 flex min-h-[calc(100vh-9.25rem)] min-w-full flex-col text-foreground">
          {children}
        </div>
      </div>
    </ProviderHelper>
  );
}
