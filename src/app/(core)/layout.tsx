import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import ClientProviders from "@/components/client-providers";

export const metadata: Metadata = {
  title: "Cosmo",
  description: "Cosmo",
};

export default async function CoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientProviders>
      <div className="max-w-screen h-screen">
        <Navbar />

        {/* content */}
        <div className="m-auto mb-5 flex min-h-[calc(100vh-9.25rem)] min-w-full flex-col text-foreground pt-16">
          {children}
        </div>
      </div>
    </ClientProviders>
  );
}
