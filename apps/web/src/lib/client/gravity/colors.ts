import type {
  CosmoArtistWithMembersBFF,
  CosmoMemberBFF,
} from "@apollo/cosmo/types/artists";
import type { CosmoPollChoices } from "@apollo/cosmo/types/gravity";
import { candidateLabel } from "./slots";
import type { PollSlot, PollSlotModel } from "./slots";
import { findMember, pollCandidates } from "./util";

/**
 * Candidate colors come from the gravity's artist, of which only the member
 * list is used. Undefined covers an artist that isn't known, which degrades to
 * hashed colors.
 */
export type CandidateColorArtist =
  | Pick<CosmoArtistWithMembersBFF, "artistMembers">
  | undefined;

export type CandidateColors = {
  /** Colors in candidate order, indexed by on-chain candidate id. */
  colors: string[];
  /** Color for a candidate id, defined for any index. */
  color: (candidateId: number) => string;
};

/**
 * Resolve a color for every candidate of a poll, each by name, then by the
 * member at its position, so a poll stays on the artist's palette whether or
 * not every candidate is a member.
 */
export function resolveCandidateColors(
  artist: CandidateColorArtist,
  candidateTitles: string[],
): CandidateColors {
  const colors = candidateTitles.map((title, index) =>
    resolveCandidateColor(artist, title, index),
  );

  return {
    colors,
    color: (candidateId) =>
      colors[candidateId] ??
      resolveCandidateColor(artist, String(candidateId), candidateId),
  };
}

/**
 * Resolve a color for a single candidate: the member it names (by name or
 * alias), else the member at its position, else a hash of its title. A poll
 * with more candidates than the artist has members runs the palette out, so
 * the tail hashes rather than repeating a color. Combination poll slots
 * resolve per slot candidate so a member appearing in multiple slots keeps one
 * color across the columns.
 */
export function resolveCandidateColor(
  artist: CandidateColorArtist,
  name: string,
  index: number,
): string {
  const members = artist?.artistMembers ?? [];
  return (
    memberColor(findMember(members, name)) ??
    memberColor(members[index]) ??
    hashedColor(name)
  );
}

/** Podium colors, in rank order. Every other rank is left muted. */
const PODIUM_COLORS = [
  "hsl(40 90% 60%)",
  "hsl(222 19% 79%)",
  "hsl(25 55% 59%)",
];

/**
 * Color for a 1-based position, undefined off the podium.
 */
export function rankColor(rank: number): string | undefined {
  return PODIUM_COLORS[rank - 1];
}

/**
 * How one on-chain choice reads: what it picks, the color it is drawn in, and the image COSMO shows for it.
 */
export type ChoiceStyle = {
  label: string;
  /** The first slot's member color. */
  color: string;
  /** COSMO's card image for the choice; undefined when it ships none. */
  imageUrl: string | undefined;
};

/**
 * Label, color and image for every on-chain choice, keyed by candidate id. A
 * combination choice spans every slot, so it is named after the members it
 * picks and colored by the member it picks in the first slot.
 */
export function resolveChoiceStyles(
  artist: CandidateColorArtist,
  model: PollSlotModel,
  poll: CosmoPollChoices,
): Map<number, ChoiceStyle> {
  const styles = new Map<number, ChoiceStyle>();
  // candidate content is in candidate id order: a choice's card for a
  // combination poll, the candidate's own image for a single one
  const images = pollCandidates(poll).map(
    (candidate) => candidate.content.imageUrl,
  );

  if (model.kind !== "combination") {
    const [slot] = model.slots;
    const colors = resolveCandidateColors(
      artist,
      slot.candidates.map((candidate) => candidate.name),
    );

    for (const candidate of slot.candidates) {
      for (const candidateId of candidate.candidateIds) {
        styles.set(candidateId, {
          label: candidateLabel(candidate),
          color: colors.color(candidateId),
          imageUrl: firstImage(images[candidateId], candidate.imageUrl),
        });
      }
    }

    return styles;
  }

  for (const slot of model.slots) {
    for (const [index, candidate] of slot.candidates.entries()) {
      for (const candidateId of candidate.candidateIds) {
        const picked = styles.get(candidateId);
        styles.set(
          candidateId,
          picked === undefined
            ? {
                label: candidate.name,
                color: resolveCandidateColor(artist, candidate.name, index),
                // a choice without a card falls back to its first slot member
                imageUrl: firstImage(images[candidateId], candidate.imageUrl),
              }
            : { ...picked, label: `${picked.label} + ${candidate.name}` },
        );
      }
    }
  }

  return styles;
}

/**
 * One line the chart can draw: a candidate of a single poll, or a member in one slot of a combination poll.
 */
export type ChartLine = {
  key: string;
  label: string;
  color: string;
  /**
   * A unit pairing reads as both of its members, so its line and swatch run
   * between their colors. Null for a line drawn in one color.
   */
  gradient: readonly [string, string] | null;
  /** On-chain candidate ids the line sums, indexes into `comoPerCandidate`. */
  candidateIds: number[];
};

/**
 * Lines the chart may draw, per slot. A combination poll races a member per
 * slot, so a line is named after both and colored like the slot's race row.
 */
export function resolveChartLines(
  artist: CandidateColorArtist,
  model: PollSlotModel,
): ChartLine[][] {
  return model.slots.map((slot) => {
    const color = resolveSlotColors(artist, model, slot);

    return slot.candidates.map((candidate) => {
      const [first, second] = candidate.members;
      const gradient =
        first !== undefined && second !== undefined
          ? ([color(first.name), color(second.name)] as const)
          : null;

      return {
        key: `${slot.id}:${candidate.name}`,
        label:
          model.kind === "combination"
            ? `${slot.name} – ${candidate.name}`
            : candidateLabel(candidate),
        // a pairing takes its members' colors rather than the palette position
        // its label happens to land on
        color: gradient?.[0] ?? color(candidate.name),
        gradient,
        candidateIds: candidate.candidateIds,
      };
    });
  });
}

/**
 * Color for each of a slot's candidates, by name. A single poll colors its
 * candidates as one set so a member-only poll is detected across all of them;
 * a combination slot resolves per name, keeping a member's color the same in
 * every slot it races in.
 */
export function resolveSlotColors(
  artist: CandidateColorArtist,
  model: PollSlotModel,
  slot: PollSlot,
): (name: string) => string {
  const names = slot.candidates.map((candidate) => candidate.name);
  const colors =
    model.kind === "combination"
      ? names.map((name, index) => resolveCandidateColor(artist, name, index))
      : resolveCandidateColors(artist, names).colors;
  const byName = new Map(names.map((name, index) => [name, colors[index]]));

  return (name) => byName.get(name) ?? resolveCandidateColor(artist, name, 0);
}

/**
 * A member's color, treating an unset color as no color.
 */
function memberColor(member: CosmoMemberBFF | undefined) {
  return member !== undefined && member.primaryColorHex.length > 0
    ? member.primaryColorHex
    : undefined;
}

/**
 * COSMO ships an empty string where it has no image.
 */
function firstImage(...urls: (string | undefined)[]) {
  return urls.find((url) => url !== undefined && url.length > 0);
}

/**
 * Hex color derived from a name. Hashing rather than randomizing keeps a
 * candidate's color identical between renders, and the fixed saturation and
 * lightness keep it legible against both themes.
 */
export function hashedColor(name: string) {
  // FNV-1a
  let hash = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hslToHex((hash >>> 0) % 360, 0.65, 0.55);
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const amplitude = saturation * Math.min(lightness, 1 - lightness);
  const channel = (offset: number) => {
    const k = (offset + hue / 30) % 12;
    const value =
      lightness - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${channel(0)}${channel(8)}${channel(4)}`;
}
