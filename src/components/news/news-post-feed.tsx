import { CosmoNewsSectionFeedContent } from "@/lib/universal/cosmo/news";
import Image from "next/image";
import Timestamp from "../ui/timestamp";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";

export default function NewsPostFeed({
  post,
  fullWidth,
}: {
  post: CosmoNewsSectionFeedContent;
  fullWidth: boolean;
}) {
  const columns = fullWidth
    ? 1
    : post.imageUrls.length > 3
    ? Math.floor(post.imageUrls.length / 2)
    : post.imageUrls.length;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-2">
        <Avatar className="border border-accent">
          <AvatarFallback>{post.artist.at(0)}</AvatarFallback>
          <AvatarImage src={post.logoImageUrl} alt={post.artist} />
        </Avatar>

        <div className="flex flex-col">
          <span className="font-bold">{post.artist}</span>
          <span className="text-muted-foreground text-sm">
            <Timestamp timestamp={post.createdAt} />
          </span>
        </div>
      </div>

      <p>{post.body}</p>

      <div
        className={cn(
          "grid gap-1 rounded-xl overflow-hidden w-full",
          `grid-cols-${columns}`
        )}
      >
        {post.imageUrls.map((image) => (
          <div key={image} className="relative aspect-square w-full">
            <Image src={image} alt={post.body} fill={true} quality={100} />
          </div>
        ))}
      </div>
    </div>
  );
}
