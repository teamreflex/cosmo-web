import { CosmoNewsSectionFeed } from "@/lib/universal/cosmo";
import NewsPostFeed from "./news-post-feed";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

type Props = {
  section: CosmoNewsSectionFeed;
  fullWidth: boolean;
};

export default function NewsSectionFeed({ section, fullWidth }: Props) {
  return (
    <div className="flex flex-col gap-2 w-full md:w-1/2 py-4 border-none">
      <Link
        href="/news/feed"
        className="font-bold text-xl flex items-center justify-between"
      >
        {section.title}
        <ChevronRight className="w-6 h-6 text-foreground/50" />
      </Link>
      {section.contents.map((post) => (
        <NewsPostFeed key={post.id} post={post} fullWidth={fullWidth} />
      ))}
    </div>
  );
}
