import { Suspense } from "react";
import Image from "next/image";
import NewsRenderer from "@/components/news/news-renderer";
import { Metadata } from "next";
import { env } from "@/env.mjs";
import { decodeUser } from "./data-fetching";
import ApolloErrorBoundary from "@/components/error-boundary";

export const runtime = "edge";
export const metadata: Metadata = {
  title: "Home",
};

export default async function HomePage() {
  const user = await decodeUser();

  if (!user) {
    return (
      <span className="flex flex-col justify-center items-center w-full gap-2 py-12">
        <Image
          src="/cosmo.png"
          width={100}
          height={100}
          quality={100}
          alt="Cosmo"
        />
        <span className="font-semibold text-lg">
          Welcome to{" "}
          <span className="font-cosmo uppercase">
            {env.NEXT_PUBLIC_APP_NAME}
          </span>
          <p className="text-sm text-center">Please sign in</p>
        </span>
      </span>
    );
  }

  return (
    <main className="flex flex-col items-center container">
      <Suspense fallback={<NewsSkeleton />}>
        <ApolloErrorBoundary message="Could not load news">
          <NewsRenderer user={user!} />
        </ApolloErrorBoundary>
      </Suspense>
    </main>
  );
}

function NewsSkeleton() {
  return (
    <div className="flex flex-col gap-2 items-center animate-pulse w-full sm:w-1/2 py-4">
      <div className="bg-accent rounded-lg h-48 w-full" />
      <div className="bg-accent rounded-lg h-24 w-full" />
    </div>
  );
}
