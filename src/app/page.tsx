import { Suspense } from "react";
import NewsRenderer from "@/components/news/news-renderer";
import { Metadata } from "next";
import ApolloErrorBoundary from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "Home",
};

export default async function HomePage() {
  return (
    <main className="flex flex-col items-center container py-2">
      <ApolloErrorBoundary message="Could not load news">
        <Suspense fallback={<NewsSkeleton />}>
          <NewsRenderer />
        </Suspense>
      </ApolloErrorBoundary>
    </main>
  );
}

function NewsSkeleton() {
  return (
    <div className="flex flex-col gap-2 items-center animate-pulse w-full sm:w-1/2 py-4">
      <div className="bg-accent rounded-lg aspect-video w-full" />
    </div>
  );
}
