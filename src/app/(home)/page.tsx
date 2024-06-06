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
        <NewsRenderer />
      </ApolloErrorBoundary>
    </main>
  );
}
