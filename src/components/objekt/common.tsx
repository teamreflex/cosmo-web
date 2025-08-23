import type { NonTransferableReason } from "@/lib/universal/cosmo/objekts";
import { useElementSize } from "@/hooks/use-element-size";
import { cn, type PropsWithClassName } from "@/lib/utils";
import { Fragment, useState, type PropsWithChildren } from "react";
import ArtistLogo from "./artist-logo";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import Image from "next/image";

type ObjektSidebarProps = {
  collection: Objekt.Collection;
  serial?: number;
};

const fontSizeConfig = {
  collection: 0.55,
  name: 0.45,
} as const;

type SidebarTextProps = PropsWithChildren<{
  type: keyof typeof fontSizeConfig;
}>;

function SidebarText(props: SidebarTextProps) {
  return (
    <span
      style={{
        "--font-ratio": fontSizeConfig[props.type],
      }}
      className="text-[calc(var(--sidebar-width)*var(--font-ratio))]/[var(--sidebar-width)]"
    >
      {props.children}
    </span>
  );
}

export function ObjektSidebar({ collection, serial }: ObjektSidebarProps) {
  const [bandLoaded, setBandLoaded] = useState(false);
  const [ref, { width }] = useElementSize();

  const paddedSerial =
    serial === 0 ? "00000" : serial?.toString().padStart(5, "0");

  const useCustomBand = collection.artist === "idntt";
  const useBackground =
    useCustomBand && (!collection.bandImageUrl || !bandLoaded);

  /**
   * sometimes the first element in the grid is a couple pixels smaller on the width, resulting in an offset number, not sure why.
   * using line-height works around it, as the background container is transparent so there's no resulting overflow.
   * sometimes the actual objekt image has a larger border by a few px (~12% width), this cannot account for that.
   */
  return (
    <Fragment>
      {collection.bandImageUrl && (
        <Image
          src={collection.bandImageUrl}
          className={cn(
            "top-0 left-0 h-full w-full object-cover pointer-events-none opacity-0 transition-opacity",
            bandLoaded && "opacity-100"
          )}
          alt={`${collection.artist} band image`}
          onLoad={() => setBandLoaded(true)}
          priority
          fill
        />
      )}

      <div
        ref={ref}
        className="absolute flex items-center h-full w-[11%] top-0 right-0"
      >
        <div
          className={cn(
            "flex justify-center items-center gap-2 [writing-mode:vertical-lr] font-semibold text-(--objekt-text-color) select-none",
            useCustomBand &&
              "rounded-l-(--border-radius) w-full h-[89%] my-auto justify-between px-(--border-padding)",
            useBackground && "bg-(--objekt-background-color)"
          )}
          style={{
            "--sidebar-width": `${width}px`,
            "--border-radius": `${width * 0.35}px`,
            "--border-padding": `${width * 0.5}px`,
          }}
        >
          {useCustomBand && (
            <SidebarText type="name">{collection.member}</SidebarText>
          )}
          <SidebarText type="collection">
            <div className="flex items-center gap-2">
              <span>{collection.collectionNo}</span>
              {paddedSerial && <span>#{paddedSerial}</span>}
            </div>
          </SidebarText>
          {useCustomBand && <ArtistLogo artist={collection.artist} />}
        </div>
      </div>
    </Fragment>
  );
}

export function ObjektNewIndicator(props: PropsWithClassName<{}>) {
  return (
    <span
      className={cn(
        "px-2 py-[3px] h-fit w-fit bg-cosmo/80 text-white rounded-full text-xs font-semibold",
        props.className
      )}
    >
      New
    </span>
  );
}

export type Hoverable =
  | "send"
  | "lock"
  | "locked"
  | "list"
  | "pin"
  | "pinned"
  | NonTransferableReason;

/**
 * Replaces the 4x or original suffix from an image URL.
 */
function replaceUrlSize(url: string, size: "2x" | "thumbnail" = "2x") {
  return url.replace(/4x|original$/i, size);
}

/**
 * Replaces the 4x suffix from both image URLs.
 */
export function getObjektImageUrls(opts: {
  frontImage: string;
  backImage: string;
}) {
  const front = replaceUrlSize(opts.frontImage);
  const back = replaceUrlSize(opts.backImage);

  return {
    front: {
      display: front,
      download: opts.frontImage,
    },
    back: {
      display: back,
      download: opts.backImage,
    },
  };
}

/**
 * Returns the edition of the collection based on the collection number.
 */
export function getEdition(collectionNo: string): string {
  const collection = parseInt(collectionNo);

  if (collection >= 101 && collection <= 108) {
    return "1st";
  }
  if (collection >= 109 && collection <= 116) {
    return "2nd";
  }
  if (collection >= 117 && collection <= 120) {
    return "3rd";
  }
  return "Unknown";
}

export class ObjektNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObjektNotFoundError";
  }
}
