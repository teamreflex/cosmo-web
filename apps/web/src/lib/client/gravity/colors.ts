import type {
  CosmoArtistWithMembersBFF,
  CosmoMemberBFF,
} from "@apollo/cosmo/types/artists";

/**
 * Candidate colors come from the gravity's artist, of which only the member
 * list is used. Undefined covers an artist that isn't known, which degrades to
 * hashed colors.
 */
export type CandidateColorArtist =
  | Pick<CosmoArtistWithMembersBFF, "artistMembers">
  | undefined;

/**
 * How a poll's candidates were colored: `member` when every candidate is a
 * member of the artist, `index` when candidates are instead mapped onto the
 * member list by position.
 */
export type CandidateColorMode = "member" | "index";

export type CandidateColors = {
  mode: CandidateColorMode;
  /** Colors in candidate order, indexed by on-chain candidate id. */
  colors: string[];
  /** Color for a candidate id, defined for any index. */
  color: (candidateId: number) => string;
};

/**
 * Resolve a color for every candidate of a poll.
 * A poll is member-based only when *every* candidate title resolves to a member
 * of the artist; a mixed or non-member poll maps each candidate onto the member
 * list by position, keeping the palette within the artist's colors either way.
 */
export function resolveCandidateColors(
  artist: CandidateColorArtist,
  candidateTitles: string[],
): CandidateColors {
  const members = artist?.artistMembers ?? [];
  const resolved = candidateTitles.map((title) => findMember(members, title));
  const mode: CandidateColorMode =
    resolved.length > 0 && resolved.every((member) => member !== undefined)
      ? "member"
      : "index";

  const colors = candidateTitles.map((title, index) =>
    mode === "member"
      ? (memberColor(resolved[index]) ?? hashedColor(title))
      : (indexColor(members, index) ?? hashedColor(title)),
  );

  return {
    mode,
    colors,
    color: (candidateId) =>
      colors[candidateId] ??
      indexColor(members, candidateId) ??
      hashedColor(String(candidateId)),
  };
}

/**
 * Resolve a color for a single candidate by name, falling back to the member at
 * the given position. Combination poll slots resolve per slot candidate so a
 * member appearing in multiple slots keeps one color across the columns.
 */
export function resolveCandidateColor(
  artist: CandidateColorArtist,
  name: string,
  index: number,
): string {
  const members = artist?.artistMembers ?? [];
  return (
    memberColor(findMember(members, name)) ??
    indexColor(members, index) ??
    hashedColor(name)
  );
}

/**
 * Case-insensitive name match, mirroring how `useArtists` keys its member map.
 */
function findMember(members: CosmoMemberBFF[], name: string) {
  const lower = name.toLowerCase();
  return members.find((member) => member.name.toLowerCase() === lower);
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
 * Candidate position mapped onto the artist's members, in member order.
 */
function indexColor(members: CosmoMemberBFF[], index: number) {
  return members.length > 0
    ? memberColor(members[index % members.length])
    : undefined;
}

/**
 * Hex color derived from a name. Hashing rather than randomizing keeps a
 * candidate's color identical between renders, and the fixed saturation and
 * lightness keep it legible against both themes.
 */
function hashedColor(name: string) {
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
