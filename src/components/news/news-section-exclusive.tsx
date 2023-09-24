import { CosmoNewsSectionExclusive } from "@/lib/server/cosmo";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import Timestamp from "../ui/timestamp";

type Props = {
  section: CosmoNewsSectionExclusive;
};

export default function NewsSectionExclusive({ section }: Props) {
  return (
    <div className="flex flex-col gap-2 w-full md:w-1/2 py-4">
      <h3 className="font-bold text-xl">COSMO Exclusive</h3>
      {section.contents.map((post) => (
        <Fragment key={post.id}>
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
            />
          </Link>
          <div className="flex flex-col">
            <p className="font-bold">{post.title}</p>
            <p className="text-sm">{post.body}</p>
            <p className="text-muted-foreground text-sm">
              <Timestamp timestamp={post.createdAt} />
            </p>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
