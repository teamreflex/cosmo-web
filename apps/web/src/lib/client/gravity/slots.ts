import type { CosmoPollChoices } from "@apollo/cosmo/types/gravity";
import type { RevealBatch } from "./reveals";
import { pollCandidates } from "./util";

/**
 * A member a unit poll's pairing picks, with the card COSMO ships for it.
 */
export type SlotCandidateMember = {
  name: string;
  imageUrl: string | undefined;
};

/**
 * One entry in a slot's race. Combination polls repeat a member across many
 * on-chain choices, so a slot candidate owns every candidate id whose choice
 * places it in that slot; single polls own exactly one.
 */
export type SlotCandidate = {
  name: string;
  imageUrl: string;
  /** On-chain candidate ids, indexes into `comoPerCandidate`. */
  candidateIds: number[];
  /** The members a unit poll's pairing picks; empty for every other poll. */
  members: SlotCandidateMember[];
};

export type PollSlot = {
  id: string;
  name: string;
  candidates: SlotCandidate[];
};

/**
 * A poll's candidates grouped into the columns they are raced in. Single and
 * unit polls carry one implicit slot so every kind renders through the same
 * rows; the kind only decides the surrounding layout. Unit polls are their own
 * kind because pairing every member squares the field, so their column folds
 * its tail the way a combination slot does.
 */
export type PollSlotModel =
  | { kind: "single"; slots: [PollSlot] }
  | { kind: "unit"; slots: [PollSlot] }
  | { kind: "combination"; slots: PollSlot[] };

/**
 * Movement of a slot candidate since the most recent reveal batch.
 */
export type SlotMovement = {
  /** COMO revealed for this candidate in the batch. */
  como: number;
  /** Positions gained; negative is a drop, zero is unchanged. */
  rankChange: number;
};

export type SlotCandidateRanking = {
  candidate: SlotCandidate;
  /** 1-based position within the slot. */
  rank: number;
  como: number;
  /** Fraction of the slot total. Every slot sums to the poll total. */
  share: number;
  /** Fraction of the slot leader's COMO, for the track bar width. */
  leaderShare: number;
  /** Null while no reveal batch has landed, and once counting finishes. */
  movement: SlotMovement | null;
};

export type SlotRanking = {
  slot: PollSlot;
  total: number;
  rows: SlotCandidateRanking[];
};

/**
 * Group a poll's candidates into slots. A unit poll races member pairings, but
 * each pairing is one on-chain choice, so it slots like a single poll.
 */
export function buildSlotModel(poll: CosmoPollChoices): PollSlotModel {
  if (poll.type !== "combination-poll") {
    const memberImages =
      poll.type === "unit-poll"
        ? poll.pollViewMetadata.memberImages
        : undefined;

    return {
      kind: poll.type === "unit-poll" ? "unit" : "single",
      slots: [
        {
          id: String(poll.id),
          name: poll.title,
          candidates: pollCandidates(poll).map((candidate, candidateId) => ({
            name: candidate.content.title,
            imageUrl: candidate.content.imageUrl,
            candidateIds: [candidateId],
            members: pairingMembers(candidate.content.title, memberImages),
          })),
        },
      ],
    };
  }

  const { slots, slotChoices, choiceIdToSlotChoicesMapTable } =
    poll.pollViewMetadata;
  const mappings = new Map(
    choiceIdToSlotChoicesMapTable.map((mapping) => [mapping.choiceId, mapping]),
  );

  // slot id -> slot choice id -> the candidate ids placing that member in the slot
  const members = new Map(
    slots.map((slot) => [slot.id, new Map<string, number[]>()]),
  );

  const knownSlotChoices = new Set(
    slotChoices.map((slotChoice) => slotChoice.id),
  );

  // a choice's position in the list is its on-chain candidate id
  for (const [candidateId, choice] of poll.choices.entries()) {
    const mapping = required(
      mappings.get(choice.id),
      `poll ${poll.id} choice ${choice.id} has no slot mapping`,
    );

    for (const [position, slotId] of mapping.slotIds.entries()) {
      const slotMembers = required(
        members.get(slotId),
        `poll ${poll.id} choice ${choice.id} references unknown slot ${slotId}`,
      );
      const slotChoiceId = required(
        mapping.slotChoiceIds[position],
        `poll ${poll.id} choice ${choice.id} has no slot choice for slot ${slotId}`,
      );
      if (!knownSlotChoices.has(slotChoiceId)) {
        throw new Error(
          `poll ${poll.id} choice ${choice.id} references unknown slot choice ${slotChoiceId}`,
        );
      }

      const candidateIds = slotMembers.get(slotChoiceId);
      if (candidateIds === undefined) {
        slotMembers.set(slotChoiceId, [candidateId]);
      } else {
        candidateIds.push(candidateId);
      }
    }
  }

  return {
    kind: "combination",
    slots: slots.map((slot) => {
      const slotMembers = required(
        members.get(slot.id),
        `poll ${poll.id} is missing slot ${slot.id}`,
      );

      // emit in COSMO's member order rather than the order choices happen to mention them
      return {
        id: slot.id,
        name: slot.name,
        candidates: slotChoices.flatMap((slotChoice) => {
          const candidateIds = slotMembers.get(slotChoice.id);
          return candidateIds === undefined
            ? []
            : [
                {
                  name: slotChoice.name,
                  imageUrl: slotChoice.roundImageUrl,
                  candidateIds,
                  members: [],
                },
              ];
        }),
      };
    }),
  };
}

/**
 * How a candidate reads: a unit pairing joins the members it picks, everything
 * else is titled as COSMO titles it. The candidate's own `name` stays COSMO's
 * string, so it remains the identity the colors and reveals key off.
 */
export function candidateLabel(candidate: SlotCandidate): string {
  return candidate.members.length > 0
    ? candidate.members.map((member) => member.name).join(" + ")
    : candidate.name;
}

/**
 * Rank every slot's candidates by revealed COMO, folding the latest reveal
 * batch into per-candidate movement.
 */
export function rankSlots(
  model: PollSlotModel,
  comoPerCandidate: number[],
  latestBatch: RevealBatch | null,
): SlotRanking[] {
  return model.slots.map((slot) =>
    rankSlot(slot, comoPerCandidate, latestBatch),
  );
}

function rankSlot(
  slot: PollSlot,
  comoPerCandidate: number[],
  latestBatch: RevealBatch | null,
): SlotRanking {
  const entries = slot.candidates.map((candidate) => {
    let como = 0;
    let batch = 0;
    for (const candidateId of candidate.candidateIds) {
      como += comoPerCandidate[candidateId] ?? 0;
      batch += latestBatch?.comoPerCandidate[candidateId] ?? 0;
    }
    return { name: candidate.name, candidate, como, batch };
  });

  const ranks = rankValues(
    entries.map((entry) => ({ name: entry.name, value: entry.como })),
  );
  const previousRanks = rankValues(
    entries.map((entry) => ({
      name: entry.name,
      value: entry.como - entry.batch,
    })),
  );

  const total = entries.reduce((sum, entry) => sum + entry.como, 0);
  const leader = Math.max(0, ...entries.map((entry) => entry.como));

  const rows = entries.map((entry, index) => {
    const rank = ranks[index] ?? index + 1;

    return {
      candidate: entry.candidate,
      rank,
      como: entry.como,
      share: total > 0 ? entry.como / total : 0,
      leaderShare: leader > 0 ? entry.como / leader : 0,
      movement:
        latestBatch === null
          ? null
          : {
              como: entry.batch,
              rankChange: (previousRanks[index] ?? rank) - rank,
            },
    } satisfies SlotCandidateRanking;
  });

  return {
    slot,
    total,
    rows: rows.toSorted((a, b) => a.rank - b.rank),
  };
}

/**
 * 1-based ranks in input order, highest value first. Names break ties so a tie
 * ranks identically before and after a reveal batch is subtracted.
 */
function rankValues(entries: { name: string; value: number }[]): number[] {
  const order = entries
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  const ranks = Array.from(entries, () => 0);
  for (const [position, entry] of order.entries()) {
    ranks[entry.index] = position + 1;
  }
  return ranks;
}

/** COSMO joins the members of a unit poll's pairing with a middle dot. */
const PAIRING_SEPARATOR = "·";

/**
 * Split a unit poll's pairing into the members it picks. Every other poll
 * races whole candidates, so it has none to split out.
 */
function pairingMembers(
  title: string,
  memberImages: Record<string, string> | undefined,
): SlotCandidateMember[] {
  if (memberImages === undefined || !title.includes(PAIRING_SEPARATOR)) {
    return [];
  }

  return title.split(PAIRING_SEPARATOR).map((part) => {
    const name = part.trim();
    const imageUrl = memberImages[name];
    // COSMO ships an empty string where it has no image
    return {
      name,
      imageUrl:
        imageUrl !== undefined && imageUrl.length > 0 ? imageUrl : undefined,
    };
  });
}

/**
 * Combination metadata is expected to reference only ids it defines; a poll
 * that breaks that is unrenderable rather than partially renderable.
 */
function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}
