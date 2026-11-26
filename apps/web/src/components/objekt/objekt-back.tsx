import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { toUiArtist } from "@apollo/cosmo/types/common";
import type { PropsWithChildren } from "react";
import { IdnttWordmark } from "./artist-logo";
import { getVariantBack } from "./variant-gradients";

type Props = {
  collection: Objekt.Collection;
};

/**
 * Recreated objekt back image.
 */
export default function ObjektBack({ collection }: Props) {
  const artist = toUiArtist(collection.artist);
  const season = /^(.*?)(\d+)$/.exec(collection.season);

  return (
    <div
      role="img"
      aria-label={collection.collectionId}
      className="absolute inset-0 bg-white font-objekt leading-none whitespace-nowrap text-(--objekt-text-color) select-none"
    >
      <div
        className="absolute top-[9.049cqi] left-0 h-[136.473cqi] w-[90.859cqi] rounded-r-[2.77cqi]"
        style={{
          background: getVariantBack(collection) ?? collection.backgroundColor,
        }}
      />

      {artist === "tripleS" &&
        (hasTrebleClef(season) ? (
          <div className="absolute top-[13.573cqi] left-[4.894cqi] h-[15.605cqi] w-[9.695cqi] bg-current mask-[url(/objekt-back/triples-clef.png)] mask-contain mask-no-repeat" />
        ) : (
          <div className="absolute top-[13.573cqi] left-[4.894cqi] h-[11.542cqi] w-[10.157cqi] bg-current mask-[url(/objekt-back/triples-cube.png)] mask-contain mask-no-repeat" />
        ))}
      {artist === "artms" && (
        <div className="absolute top-[13.573cqi] left-[4.894cqi] h-[5.448cqi] w-[31.117cqi] bg-current mask-[url(/objekt-back/artms-wordmark.png)] mask-contain mask-no-repeat" />
      )}
      {artist === "idntt" && (
        <div className="absolute top-[14.22cqi] left-[5.54cqi] h-[4.399cqi] w-[12.373cqi]">
          <IdnttWordmark />
        </div>
      )}

      <Rule className="top-[32.964cqi]" />
      <Label className="top-[33.846cqi]">
        {artist === "idntt" && collection.class === "Unit" ? "UNIT" : "NAME"}
      </Label>
      <Value className="top-[39.215cqi]">{collection.member}</Value>

      <Rule className="top-[53.324cqi]" />
      <Label className="top-[54.16cqi]">
        {artist === "idntt" ? "TYPE" : "CLASS"}
      </Label>
      <Value className="top-[59.252cqi]">{collection.class}</Value>

      <Rule className="top-[73.684cqi]" />
      <Label className="top-[74.474cqi]">SEASON</Label>
      <Value className="top-[79.843cqi]">
        {season === null ? (
          collection.season
        ) : (
          <>
            {season[1]}
            <span
              className={cn(
                "[-webkit-text-fill-color:transparent] [-webkit-text-stroke:0.203cqi_currentColor]",
                artist === "idntt" && "ml-[0.22em]",
              )}
            >
              {season[2]}
            </span>
          </>
        )}
      </Value>

      {/* the signature's space, then the white square the QR code is printed in */}
      <Rule className="top-[94.044cqi]" />
      <div className="absolute top-[94.044cqi] left-[47.23cqi] h-[29.077cqi] w-[0.222cqi] bg-current" />
      <div className="absolute top-[94.266cqi] left-[47.452cqi] h-[28.633cqi] w-[28.91cqi] bg-white" />
      <Rule className="top-[122.899cqi]" />

      <p className="absolute top-[137.292cqi] left-[5.079cqi] text-[length:3.047cqi] tracking-wide">
        ℗&amp;© MODHAUS. All Rights Reserved.
      </p>

      {/* down the right edge, reading top to bottom */}
      <p className="absolute top-[13.481cqi] left-[88.004cqi] origin-top-left rotate-90 text-[length:5.079cqi] font-bold">
        {collection.member}
      </p>
      {artist === "tripleS" && (
        <p className="absolute top-[124.007cqi] left-[88.004cqi] origin-top-left rotate-90 text-[length:5.079cqi] font-bold tracking-wide">
          tripleS
        </p>
      )}
      {artist === "artms" && (
        <div className="absolute top-[117.36cqi] left-[87.488cqi] h-[4.127cqi] w-[23.555cqi] origin-top-left rotate-90 bg-current mask-[url(/objekt-back/artms-wordmark.png)] mask-contain mask-no-repeat" />
      )}
      {artist === "idntt" && (
        <div className="absolute top-[129.363cqi] left-[87.211cqi] h-[3.94cqi] w-[11.08cqi] origin-top-left rotate-90">
          <IdnttWordmark />
        </div>
      )}
    </div>
  );
}

/**
 * Season names cycle in this order, and the number after them goes up once
 * the cycle wraps.
 */
const seasonCycle = ["Atom", "Binary", "Cream", "Divine", "Ever"];

/**
 * tripleS backs print a treble clef in place of the cube from Cream02 on. A
 * season outside the cycle is assumed to be newer.
 */
function hasTrebleClef(season: RegExpExecArray | null) {
  const index = seasonCycle.indexOf(season?.[1] ?? "");
  if (season === null || index === -1) {
    return true;
  }
  const cycle = Number(season[2]);
  return cycle > 2 || (cycle === 2 && index >= seasonCycle.indexOf("Cream"));
}

type PartProps = PropsWithChildren<{
  className: string;
}>;

function Rule({ className }: Pick<PartProps, "className">) {
  return (
    <div
      className={cn(
        "absolute left-[5.448cqi] h-[0.222cqi] w-[70.914cqi] bg-current",
        className,
      )}
    />
  );
}

function Label({ children, className }: PartProps) {
  return (
    <p
      className={cn(
        "absolute left-[5.078cqi] text-[length:3.832cqi]",
        className,
      )}
    >
      {children}
    </p>
  );
}

function Value({ children, className }: PartProps) {
  return (
    <p
      className={cn(
        "absolute left-[4.524cqi] text-[length:11.357cqi] font-medium",
        className,
      )}
    >
      {children}
    </p>
  );
}
