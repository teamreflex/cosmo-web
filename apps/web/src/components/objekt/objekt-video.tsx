import { Fragment, type PropsWithChildren } from "react";
import ReactPlayer from "react-player";

type Props = PropsWithChildren<{
  imageSrc: string;
  videoSrc: string;
  alt: string;
  muted?: boolean;
}>;

/**
 * Motion class and some audio objekts have videos.
 */
export default function ObjektVideo({ muted = true, ...props }: Props) {
  return (
    <Fragment>
      <div className="absolute inset-0 h-full w-full animate-pulse rounded-photocard bg-secondary" />
      <ReactPlayer
        className="absolute overflow-hidden rounded-photocard"
        style={{ width: "100%", height: "auto", aspectRatio: "5.5 / 8.5" }}
        src={props.videoSrc}
        preload="auto"
        playsInline={true}
        loop={true}
        muted={muted}
        volume={0.5}
        autoPlay={true}
        controls={false}
      />
      {props.children}
    </Fragment>
  );
}
