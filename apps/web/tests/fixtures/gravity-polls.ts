import type { CosmoPollChoices } from "@apollo/cosmo/types/gravity";

/**
 * A combination poll shaped like the Two Big WAVes days (COSMO poll 69):
 * choices are every ordered pair of distinct members, `choiceId` in the map
 * table matches `choices[].id`, and a choice's position in `choices` is its
 * on-chain candidate id.
 *
 * Candidate ids: 0 SeoYeon+HyeRin, 1 SeoYeon+JiWoo, 2 HyeRin+SeoYeon,
 * 3 HyeRin+JiWoo, 4 JiWoo+SeoYeon, 5 JiWoo+HyeRin.
 */
export const combinationPoll = {
  id: 69,
  artist: "tripleS",
  pollIdOnChain: 0,
  gravityId: 10,
  type: "combination-poll",
  indexInGravity: 1,
  title: "Day 1",
  imageUrl: "https://static.cosmo.fans/poll-69.png",
  startDate: "2023-04-21T09:00:00.000Z",
  endDate: "2023-04-22T07:00:00.000Z",
  revealDate: "2023-04-22T09:00:00.000Z",
  finalized: true,
  pollViewMetadata: {
    title: "Enter Title Here",
    background: null,
    slots: [
      {
        id: "EVOLution",
        name: "EVOLution",
        title: "Select for Slot 1",
        description: "Choose member for Slot 1",
        backgroundImageUrl: "https://static.cosmo.fans/slot-evol.png",
      },
      {
        id: "LOVElution",
        name: "LOVElution",
        title: "Select for Slot 2",
        description: "Choose member for Slot 2",
        backgroundImageUrl: "https://static.cosmo.fans/slot-love.png",
      },
    ],
    slotChoices: [
      {
        id: "seoyeon",
        name: "SeoYeon",
        alias: "S1",
        roundImageUrl: "https://static.cosmo.fans/round-s1.png",
        slotCardImageUrl: "https://static.cosmo.fans/card-s1.png",
      },
      {
        id: "hyerin",
        name: "HyeRin",
        alias: "S2",
        roundImageUrl: "https://static.cosmo.fans/round-s2.png",
        slotCardImageUrl: "https://static.cosmo.fans/card-s2.png",
      },
      {
        id: "jiwoo",
        name: "JiWoo",
        alias: "S3",
        roundImageUrl: "https://static.cosmo.fans/round-s3.png",
        slotCardImageUrl: "https://static.cosmo.fans/card-s3.png",
      },
    ],
    choiceIdToSlotChoicesMapTable: [
      {
        choiceId: "c1",
        slotIds: ["EVOLution", "LOVElution"],
        slotChoiceIds: ["seoyeon", "hyerin"],
      },
      {
        choiceId: "c2",
        slotIds: ["EVOLution", "LOVElution"],
        slotChoiceIds: ["seoyeon", "jiwoo"],
      },
      {
        choiceId: "c3",
        slotIds: ["EVOLution", "LOVElution"],
        slotChoiceIds: ["hyerin", "seoyeon"],
      },
      {
        choiceId: "c4",
        slotIds: ["EVOLution", "LOVElution"],
        slotChoiceIds: ["hyerin", "jiwoo"],
      },
      {
        choiceId: "c5",
        slotIds: ["EVOLution", "LOVElution"],
        slotChoiceIds: ["jiwoo", "seoyeon"],
      },
      {
        choiceId: "c6",
        slotIds: ["EVOLution", "LOVElution"],
        slotChoiceIds: ["jiwoo", "hyerin"],
      },
    ],
  },
  choices: [
    {
      id: "c1",
      title: "S1-EVOLution, S2-LOVElution",
      description: "",
      txImageUrl: "https://static.cosmo.fans/c1.png",
    },
    {
      id: "c2",
      title: "S1-EVOLution, S3-LOVElution",
      description: "",
      txImageUrl: "https://static.cosmo.fans/c2.png",
    },
    {
      id: "c3",
      title: "S2-EVOLution, S1-LOVElution",
      description: "",
      txImageUrl: "https://static.cosmo.fans/c3.png",
    },
    {
      id: "c4",
      title: "S2-EVOLution, S3-LOVElution",
      description: "",
      txImageUrl: "https://static.cosmo.fans/c4.png",
    },
    {
      id: "c5",
      title: "S3-EVOLution, S1-LOVElution",
      description: "",
      txImageUrl: "https://static.cosmo.fans/c5.png",
    },
    {
      id: "c6",
      title: "S3-EVOLution, S2-LOVElution",
      description: "",
      txImageUrl: "https://static.cosmo.fans/c6.png",
    },
  ],
} satisfies CosmoPollChoices;

/**
 * A single poll, whose candidates come from `selectedContent` in candidate id
 * order.
 */
export const singlePoll = {
  id: 210,
  artist: "artms",
  pollIdOnChain: 4,
  gravityId: 34,
  type: "single-poll",
  indexInGravity: 0,
  title: "Ballad Dimension",
  imageUrl: "https://static.cosmo.fans/poll-210.png",
  startDate: "2025-06-01T09:00:00.000Z",
  endDate: "2025-06-02T09:00:00.000Z",
  revealDate: "2025-06-02T11:00:00.000Z",
  finalized: true,
  pollViewMetadata: {
    title: "Ballad Dimension",
    background: null,
    defaultContent: {
      type: "image",
      imageUrl: "https://static.cosmo.fans/default.png",
      title: "Pick a song",
      description: "",
    },
    selectedContent: [
      {
        choiceId: "s1",
        content: {
          type: "image",
          imageUrl: "https://static.cosmo.fans/song-a.png",
          title: "Song A",
          description: "",
        },
      },
      {
        choiceId: "s2",
        content: {
          type: "image",
          imageUrl: "https://static.cosmo.fans/song-b.png",
          title: "Song B",
          description: "",
        },
      },
      {
        choiceId: "s3",
        content: {
          type: "image",
          imageUrl: "https://static.cosmo.fans/song-c.png",
          title: "Song C",
          description: "",
        },
      },
    ],
    choiceViewType: "vertical",
  },
  choices: [
    {
      id: "s1",
      title: "Song A",
      description: "",
      txImageUrl: "https://static.cosmo.fans/song-a.png",
    },
    {
      id: "s2",
      title: "Song B",
      description: "",
      txImageUrl: "https://static.cosmo.fans/song-b.png",
    },
    {
      id: "s3",
      title: "Song C",
      description: "",
      txImageUrl: "https://static.cosmo.fans/song-c.png",
    },
  ],
} satisfies CosmoPollChoices;

/**
 * A unit poll shaped like the ARTMS unit gravity: every member pairing is one
 * choice, so the on-chain candidate list is flat and a choice's position in
 * `choices` is its candidate id. `memberImages` maps a member name onto the
 * card COSMO draws for it; the pairing doubles as the choice id.
 *
 * Candidate ids: 0 HeeJin·HaSeul, 1 HeeJin·KimLip, 2 HaSeul·KimLip.
 */
export const unitPoll = {
  id: 247,
  artist: "artms",
  pollIdOnChain: 247,
  gravityId: 40,
  type: "unit-poll",
  indexInGravity: 0,
  title: "Unit Gravity",
  imageUrl: "https://static.cosmo.fans/poll-247.png",
  startDate: "2026-09-01T09:00:00.000Z",
  endDate: "2026-09-02T09:00:00.000Z",
  revealDate: "2026-09-02T11:00:00.000Z",
  finalized: false,
  pollViewMetadata: {
    title: "Unit Gravity",
    background: null,
    defaultContent: {
      type: "image",
      imageUrl: "https://static.cosmo.fans/default.png",
      title: "Pick a unit",
      description: "",
    },
    selectedContent: [
      {
        choiceId: "HeeJin·HaSeul",
        content: {
          type: "image",
          imageUrl: "https://static.cosmo.fans/heejin-haseul.png",
          title: "HeeJin·HaSeul",
          description: "",
        },
      },
      {
        choiceId: "HeeJin·KimLip",
        content: {
          type: "image",
          imageUrl: "https://static.cosmo.fans/heejin-kimlip.png",
          title: "HeeJin·KimLip",
          description: "",
        },
      },
      {
        choiceId: "HaSeul·KimLip",
        content: {
          type: "image",
          imageUrl: "https://static.cosmo.fans/haseul-kimlip.png",
          title: "HaSeul·KimLip",
          description: "",
        },
      },
    ],
    choiceViewType: "vertical",
    memberImages: {
      HeeJin: "https://static.cosmo.fans/member-heejin.png",
      HaSeul: "https://static.cosmo.fans/member-haseul.png",
      KimLip: "https://static.cosmo.fans/member-kimlip.png",
    },
  },
  choices: [
    {
      id: "HeeJin·HaSeul",
      title: "HeeJin·HaSeul",
      description: "",
      txImageUrl: "https://static.cosmo.fans/heejin-haseul.png",
    },
    {
      id: "HeeJin·KimLip",
      title: "HeeJin·KimLip",
      description: "",
      txImageUrl: "https://static.cosmo.fans/heejin-kimlip.png",
    },
    {
      id: "HaSeul·KimLip",
      title: "HaSeul·KimLip",
      description: "",
      txImageUrl: "https://static.cosmo.fans/haseul-kimlip.png",
    },
  ],
} satisfies CosmoPollChoices;
