import { CosmoNewsSectionExclusiveContent } from "@/lib/server/cosmo";
import Image from "next/image";
import Link from "next/link";
import Timestamp from "../ui/timestamp";

export default function NewsPostExclusive({
  post,
}: {
  post: CosmoNewsSectionExclusiveContent;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <Link
        href={post.url}
        target="_blank"
        className="relative aspect-video rounded-xl border border-accent overflow-hidden"
      >
        <Image
          src={post.thumbnailImageUrl}
          alt={post.title}
          fill={true}
          className="object-contain"
          quality={100}
        />
      </Link>
      <div className="flex flex-col">
        <p className="font-bold">{post.title}</p>
        <p className="text-sm">{post.body}</p>
        <p className="text-muted-foreground text-sm">
          <Timestamp timestamp={post.createdAt} />
        </p>
      </div>
    </div>
  );
}
