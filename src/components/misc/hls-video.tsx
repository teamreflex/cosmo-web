import "@vidstack/react/player/styles/base.css";
import { MediaPlayer, MediaProvider, Poster } from "@vidstack/react";

type Props = {
  videoUrl: string;
  thumbnailUrl?: string | undefined;
  title?: string | undefined;
};

export default function HLSVideo({ videoUrl, thumbnailUrl, title }: Props) {
  return (
    <MediaPlayer
      title={title}
      src={videoUrl}
      controls={true}
      viewType="video"
      streamType="on-demand"
    >
      <MediaProvider>
        {thumbnailUrl !== undefined && (
          <Poster
            className="absolute inset-0 block h-full w-full rounded-xl opacity-0 transition-opacity data-[visible]:opacity-100 [&>img]:h-full [&>img]:w-full [&>img]:object-cover"
            src={thumbnailUrl}
            alt={title ?? "video"}
          />
        )}
      </MediaProvider>
    </MediaPlayer>
  );
}
