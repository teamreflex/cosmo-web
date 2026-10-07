import { LogoSVG } from "@/components/logo";
import { env } from "@/lib/env/client";
import { PROFILE_CARD_FONTS } from "@/lib/universal/profile-card";
import type { CardPlacement, ProfileCard } from "@/lib/universal/profile-card";
import { format } from "date-fns";

const BACKGROUND = "#141519";
const MUTED = "#a3a5ad";
const BORDER = "rgba(255, 255, 255, 0.09)";

/**
 * Faint outlines standing in for objekts on an account that has none.
 */
const EMPTY_OUTLINES = [
  { left: 1010, top: -90, rotate: 16, opacity: 0.08 },
  { left: 860, top: -150, rotate: -5, opacity: 0.06 },
  { left: 1000, top: 400, rotate: -14, opacity: 0.08 },
  { left: 840, top: 470, rotate: 6, opacity: 0.06 },
];

type Props = {
  card: ProfileCard;
  /** Image sources in placement order. */
  images: string[];
  placements: CardPlacement[];
};

/**
 * The 1200×630 OpenGraph card for a profile, rendered to an image by takumi
 * rather than in the browser.
 */
export default function ProfileCardImage({ card, images, placements }: Props) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        overflow: "hidden",
        backgroundColor: BACKGROUND,
        backgroundImage:
          "radial-gradient(760px 420px at 50% 0%, rgba(124, 58, 237, 0.26), rgba(124, 58, 237, 0) 70%)",
        color: "#f6f6f8",
        fontFamily: PROFILE_CARD_FONTS.body,
      }}
    >
      {images.length === 0 &&
        EMPTY_OUTLINES.map((outline) => (
          <div
            key={`${outline.left}-${outline.top}`}
            style={{
              position: "absolute",
              left: outline.left,
              top: outline.top,
              width: 220,
              height: 340,
              transform: `rotate(${outline.rotate}deg)`,
              border: `2px solid rgba(255, 255, 255, ${outline.opacity})`,
              borderRadius: 12,
            }}
          />
        ))}

      {placements.flatMap((place, i) => {
        const src = images.at(i);
        return src === undefined
          ? []
          : [
              <img
                key={src}
                src={src}
                style={{
                  position: "absolute",
                  left: place.left,
                  top: place.top,
                  width: place.width,
                  height: place.height,
                  transform: `rotate(${place.rotate}deg)`,
                  zIndex: place.zIndex,
                  objectFit: "cover",
                  borderRadius: place.width * 0.0545,
                  boxShadow:
                    "0 14px 36px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.4)",
                }}
              />,
            ];
      })}

      <div
        style={{
          position: "absolute",
          left: 48,
          top: 44,
          height: 58,
          display: "flex",
          zIndex: 1000,
          filter:
            "drop-shadow(0 2px 3px rgba(0, 0, 0, 0.7)) drop-shadow(0 6px 18px rgba(0, 0, 0, 0.55))",
        }}
      >
        <LogoSVG themed={false} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 40,
          bottom: 40,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: "30px 36px 28px",
          backgroundColor: "rgba(20, 21, 25, 0.94)",
          border: `1px solid ${BORDER}`,
          borderRadius: 18,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div
          style={
            card.isAddress
              ? {
                  fontFamily: PROFILE_CARD_FONTS.display,
                  fontSize: 26,
                  lineHeight: 1.1,
                }
              : {
                  fontFamily: PROFILE_CARD_FONTS.display,
                  fontSize: nameSize(card.name),
                  lineHeight: 0.9,
                  textTransform: "uppercase",
                }
          }
        >
          {card.name}
        </div>
        <div
          style={{
            fontFamily: PROFILE_CARD_FONTS.mono,
            fontSize: 22,
            color: MUTED,
          }}
        >
          {`${env.VITE_BASE_URL}/@${card.name}`}
        </div>
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 6,
            paddingTop: 18,
            borderTop: `1px solid ${BORDER}`,
          }}
        >
          <Stat
            value={card.objektCount.toLocaleString("en-US")}
            label={card.objektCount === 1 ? "objekt" : "objekts"}
          />
          {card.since !== null && (
            <>
              <div style={{ width: 1, backgroundColor: BORDER }} />
              <Stat value={format(card.since, "MMM yyyy")} label="since" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, color: MUTED }}>{label}</div>
    </div>
  );
}

/**
 * Halvar Breit is very wide, so long usernames step down from 76px to stay
 * inside the card.
 */
function nameSize(name: string) {
  return Math.min(76, Math.floor(1000 / (name.length * 0.95)));
}
