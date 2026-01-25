import { useObjektBands } from "@/hooks/use-objekt-bands";
import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { bands } from "@apollo/cosmo/bands";
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
  const { hidden } = useObjektBands();
  const [bandLoaded, setBandLoaded] = useState(false);

  const paddedSerial =
    serial === 0 ? "00000" : serial?.toString().padStart(5, "0");

  const useCustomBand = collection.artist === "idntt";
  const bandImageUrl =
    collection.bandImageUrl ?? bands[collection.artist]?.[collection.class];
  const useBackground = useCustomBand && (!bandImageUrl || !bandLoaded);
  const showBand =
    // handle tripleS/ARTMS
    useCustomBand === false ||
    // handle idntt
    (!hidden && (useBackground || useCustomBand));

  /**
   * sometimes the first element in the grid is a couple pixels smaller on the width, resulting in an offset number, not sure why.
   * using line-height works around it, as the background container is transparent so there's no resulting overflow.
   * sometimes the actual objekt image has a larger border by a few px (~12% width), this cannot account for that.
   */
  return (
    <Fragment>
      {showBand && bandImageUrl && (
        <img
          src={bandImageUrl}
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
            showBand && useBackground && "bg-(--objekt-background-color)",
          )}
        >
          {showBand && (
            <Fragment>
              {useCustomBand && (
                <SidebarText type="name">{collection.member}</SidebarText>
              )}
              <SidebarText
                type="collection"
                className={cn(
                  useCustomBand && "absolute top-1/2 -translate-y-1/2",
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{collection.collectionNo}</span>
                  {paddedSerial && <span>#{paddedSerial}</span>}
                </div>
              </SidebarText>
              {useCustomBand && <ArtistLogo artist={collection.artist} />}
            </Fragment>
          )}
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
