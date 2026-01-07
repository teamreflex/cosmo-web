import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { NonTransferableReason } from "@apollo/cosmo/types/objekts";
import { Fragment, useState } from "react";
import type { CSSProperties, PropsWithChildren } from "react";
import ArtistLogo from "./artist-logo";

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
  className?: string;
}>;

function SidebarText(props: SidebarTextProps) {
  return (
    <span
      className={props.className}
      style={
        {
          fontSize: `${fontSizeConfig[props.type] * 100}cqw`,
          lineHeight: "100cqw",
        } as CSSProperties
      }
    >
      {props.children}
    </span>
  );
}

export function ObjektSidebar({ collection, serial }: ObjektSidebarProps) {
  const [bandLoaded, setBandLoaded] = useState(false);

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
        <img
          src={collection.bandImageUrl}
          className={cn(
            "pointer-events-none absolute top-0 left-0 h-full w-full object-cover opacity-0 transition-opacity",
            bandLoaded && "opacity-100",
          )}
          alt={m.objekt_band_image({ artist: collection.artist })}
          onLoad={() => setBandLoaded(true)}
        />
      )}

      <div className="@container absolute top-0 right-0 flex h-full w-[11%] items-center">
        <div
          className={cn(
            "flex items-center justify-center gap-2 font-semibold text-(--objekt-text-color) select-none [writing-mode:vertical-lr]",
            useCustomBand &&
              "my-auto h-[89%] w-full justify-between rounded-l-[35cqw] px-[50cqw]",
            useBackground && "bg-(--objekt-background-color)",
          )}
        >
          {useCustomBand && (
            <SidebarText type="name">{collection.member}</SidebarText>
          )}
          <SidebarText
            type="collection"
            className={cn(useCustomBand && "absolute top-1/2 -translate-y-1/2")}
          >
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
        "h-fit w-fit rounded-full bg-cosmo/80 px-2 py-[3px] text-xs font-semibold text-white",
        props.className,
      )}
    >
      {m.common_new()}
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

  if ((collection >= 101 && collection <= 108) || collection === 501) {
    return m.objekt_edition_1st();
  }
  if ((collection >= 109 && collection <= 116) || collection === 502) {
    return m.objekt_edition_2nd();
  }
  if ((collection >= 117 && collection <= 120) || collection === 503) {
    return m.objekt_edition_3rd();
  }
  return m.common_unknown();
}

export class ObjektNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObjektNotFoundError";
  }
}
