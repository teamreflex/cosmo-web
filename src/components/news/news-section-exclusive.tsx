import { CosmoNewsSectionExclusive } from "@/lib/universal/cosmo/news";
import NewsPostExclusive from "./news-post-exclusive";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

type Props = {
  section: CosmoNewsSectionExclusive;
};

export default function NewsSectionExclusive({ section }: Props) {
  return (
    <div className="flex flex-col gap-2 w-full md:w-1/2 py-4">
      <Link
        href="/news/exclusive"
        className="font-bold text-xl flex items-center justify-between"
      >
        {section.title}
        <ChevronRight className="w-6 h-6 text-foreground/50" />
      </Link>
      {section.contents.map((post) => (
        <NewsPostExclusive key={post.id} post={post} />
      ))}
    </div>
  );
}
