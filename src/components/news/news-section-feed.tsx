import { CosmoNewsSectionFeed } from "@/lib/server/cosmo";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Fragment } from "react";
import Image from "next/image";
import Timestamp from "../ui/timestamp";

type Props = {
  section: CosmoNewsSectionFeed;
};

export default function NewsSectionFeed({ section }: Props) {
  return (
    <div className="flex flex-col gap-2 w-full md:w-1/2 py-4">
      <h3 className="font-bold text-xl">{section.title}</h3>
      {section.contents.map((post) => (
        <Fragment key={post.id}>
          <div className="flex gap-2">
            <Avatar className="border border-accent">
              <AvatarFallback>{post.artist.at(0)}</AvatarFallback>
              <AvatarImage src={post.logoImageUrl} />
            </Avatar>

            <div className="flex flex-col">
              <span className="font-bold">{post.artist}</span>
              <span className="text-muted-foreground text-sm">
                <Timestamp timestamp={post.createdAt} />
              </span>
            </div>
          </div>

          <p>{post.body}</p>

          <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden w-full">
            {post.imageUrls.map((image) => (
              <div key={image} className="relative aspect-square w-full">
                <Image src={image} alt={post.body} fill={true} quality={100} />
              </div>
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
