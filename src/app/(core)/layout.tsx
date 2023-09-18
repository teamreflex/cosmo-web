import type { Metadata } from "next";
import { cookies } from "next/headers";
import { decodeToken } from "@/lib/server/jwt";
import { ProviderHelper } from "@/components/provider";

export const metadata: Metadata = {
  title: "Cosmo",
  description: "Cosmo",
};

async function getToken() {
  const token = cookies().get("token")?.value;
  if (token) {
    const decoded = await decodeToken(token);
    if (decoded.success) {
      return decoded.payload;
    }
  }
}

export default async function CoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getToken();

  return <ProviderHelper user={user!}>{children}</ProviderHelper>;
}
