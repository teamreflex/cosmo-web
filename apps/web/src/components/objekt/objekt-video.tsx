import { Fragment, type PropsWithChildren } from "react";
import ReactPlayer from "react-player";

type Props = PropsWithChildren<{
  imageSrc: string;
  videoSrc: string;
  alt: string;
}>;

/**
 * Motion class objekts have videos.
 */
export default function ObjektVideo(props: Props) {
  return (
    <Fragment>
      <div className="absolute inset-0 h-full w-full animate-pulse rounded-2xl bg-secondary" />
      <ReactPlayer
        className="absolute overflow-hidden rounded-2xl"
        style={{ width: "100%", height: "auto", aspectRatio: "5.5 / 8.5" }}
        src={props.videoSrc}
        preload="auto"
        playsInline={true}
        loop={true}
        muted={true}
        autoPlay={true}
        controls={false}
      />
      {props.children}
    </Fragment>
  );
}
