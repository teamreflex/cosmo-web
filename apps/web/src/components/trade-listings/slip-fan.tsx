import { useArtists } from "@/hooks/use-artists";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { rangeArtist, rangeMember } from "@/lib/client/trade-listings";
import type { SlipCard } from "@/lib/universal/listing-slip";
import { artistColors } from "@/lib/utils";
import type { RangeFilter } from "@apollo/trades/range";
import { IconCards } from "@tabler/icons-react";
import { SlipFanCard, SlipFanFrame } from "./slip";

/**
 * A side's first pictures as a fan of cards, which the side's chips name,
 * so a screen reader skips it.
 */
export function SlipFan({ cards }: { cards: readonly SlipCard[] }) {
  return (
    <SlipFanFrame count={cards.length}>
      {cards.map((card, index) => (
        <SlipFanCard key={card.key} index={index}>
          <Card card={card} />
        </SlipFanCard>
      ))}
    </SlipFanFrame>
  );
}

function Card({ card }: { card: SlipCard }) {
  switch (card.kind) {
    case "objekt":
      return card.collection === null ? (
        <span className="size-full bg-muted" />
      ) : (
        <img
          src={getObjektFrontImageUrl(card.collection, "xs")}
          alt=""
          width={44}
          height={68}
          loading="lazy"
          decoding="async"
          className="size-full bg-muted object-cover object-top"
        />
      );
    case "range":
      return <RangeCard ranges={card.ranges} />;
    case "payment":
      // the tint sits on the card's colour, so a card behind never shows through
      return (
        <span className="flex size-full bg-card">
          <span className="flex flex-1 items-center justify-center bg-amber-500/15 font-mono text-xxs font-semibold text-amber-700 dark:text-amber-400">
            {card.currency}
          </span>
        </span>
      );
  }
}

/**
 * A range want's card: dashed and washed in the colour of the one member
 * it narrows to, with their picture, else of its one group, with its logo,
 * else neutral.
 */
function RangeCard({ ranges }: { ranges: readonly RangeFilter[] }) {
  const { getArtist, getMember } = useArtists();
  const memberName = rangeMember(ranges);
  const member = memberName === null ? undefined : getMember(memberName);
  const artist = rangeArtist(ranges);
  const image =
    member?.profileImageUrl ??
    (artist === null ? undefined : getArtist(artist)?.logoImageUrl);
  const tint =
    member?.primaryColorHex ??
    (artist === null ? "var(--color-muted-foreground)" : artistColors[artist]);

  return (
    <span
      style={{ "--tint": tint }}
      className="flex size-full items-center justify-center rounded-[3px] border border-dashed border-(--tint)/75 bg-[color-mix(in_oklab,var(--tint)_22%,var(--color-card))]"
    >
      {image === undefined ? (
        <IconCards className="w-1/2 text-muted-foreground" />
      ) : (
        <img
          src={image}
          alt=""
          className="aspect-square w-1/2 rounded-full ring-1 ring-border"
        />
      )}
    </span>
  );
}
