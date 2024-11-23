import ScaledImage from "@/components/scaled-image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Timestamp from "@/components/ui/timestamp";
import { CosmoBFFNewsFeedItem } from "@/lib/universal/cosmo/news";
import { DownloadCloud, Heart } from "lucide-react";

export default function BFFNewsPostFeed({
  post,
}: {
  post: CosmoBFFNewsFeedItem;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-2">
        <Avatar className="border border-accent">
          <AvatarFallback>{post.artist.title.at(0)}</AvatarFallback>
          <AvatarImage src={post.artist.logoImageUrl} alt={post.artist.title} />
        </Avatar>

        <div className="flex flex-col">
          <span className="font-bold">{post.artist.title}</span>
          <span className="text-muted-foreground text-sm">
            <Timestamp timestamp={post.data.activeAt} />
          </span>
        </div>
      </div>

      <p>{post.data.body}</p>

      <div className="grid gap-1 rounded-xl overflow-hidden w-full grid-cols-1">
        {post.images.map((image, i) => (
          <div className="relative" key={`${post.data.id}-${i}`}>
            <ScaledImage src={image.thumbnail} alt={post.data.body} />

            <div className="absolute h-20 w-full bottom-0 left-0 flex items-end justify-between p-3 bg-linear-to-b from-transparent to-black/50">
              <div className="flex items-center gap-2">
                <Heart className="h-6 w-6" />
                <p className="font-semibold">{post.data.totalLikeCount}</p>
              </div>
              <a href={image.original ?? image.thumbnail} target="_blank">
                <DownloadCloud className="h-6 w-6" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
