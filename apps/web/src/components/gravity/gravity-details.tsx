import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  CosmoOngoingGravity,
  CosmoPastGravity,
} from "@apollo/cosmo/types/gravity";
import { lazy, Suspense } from "react";

// the player is only needed by bodies that carry a video, so it stays out of the route bundle
const ReactPlayer = lazy(() => import("react-player"));

type Gravity = CosmoOngoingGravity | CosmoPastGravity;
type BodyItem = Gravity["body"][number];

/** COSMO lays the body out at this width, so image heights are relative to it. */
const DESIGN_WIDTH = 375;

const ALIGN = {
  left: "text-left",
  start: "text-left",
  center: "text-center",
  right: "text-right",
} as const satisfies Record<
  Extract<BodyItem, { align: string }>["align"],
  string
>;

type Props = {
  gravity: Gravity;
};

/**
 * The gravity as COSMO presents it in-app: its banner, description and the
 * admin-authored body of headings, text, images and video.
 */
export default function GravityDetails({ gravity }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <img
        src={gravity.bannerImageUrl}
        alt={gravity.title}
        loading="lazy"
        className="aspect-square w-full rounded-lg object-cover"
      />

      <p className="text-center text-sm whitespace-pre-line text-muted-foreground">
        {gravity.description}
      </p>

      <div className="flex flex-col">
        {gravity.body.map((item, index) => (
          <BodyBlock key={index} item={item} />
        ))}
      </div>
    </div>
  );
}

function BodyBlock({ item }: { item: BodyItem }) {
  switch (item.type) {
    case "spacing":
      return <div style={{ height: item.height }} />;
    case "heading":
      return (
        <h3 className={cn("font-cosmo text-lg", ALIGN[item.align])}>
          {item.text}
        </h3>
      );
    case "text":
      // COSMO centers every text block regardless of its align
      return (
        <p className="text-center text-sm whitespace-pre-line">{item.text}</p>
      );
    case "image":
      return (
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          className="w-full rounded-lg"
          // holds the space until the image loads, then its own ratio takes over
          style={{ aspectRatio: `auto ${DESIGN_WIDTH} / ${item.height}` }}
        />
      );
    case "video":
      return (
        <Suspense
          fallback={<Skeleton className="aspect-video w-full rounded-lg" />}
        >
          <ReactPlayer
            className="overflow-hidden rounded-lg"
            style={{ width: "100%", height: "auto", aspectRatio: "16 / 9" }}
            src={item.videoUrl}
            poster={item.thumbnailImageUrl}
            controls={item.useController}
            controlsList={item.allowFullScreen ? undefined : "nofullscreen"}
            playsInline={true}
            preload="none"
          />
        </Suspense>
      );
    default:
      item satisfies never;
      return null;
  }
}
