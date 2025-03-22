import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  profiles: {
    lockedObjekts: r.many.lockedObjekts(),
    lists: r.many.lists(),
    objektMetadata: r.many.objektMetadata(),
    pins: r.many.pins(),
  },
  lockedObjekts: {
    profile: r.one.profiles({
      from: r.lockedObjekts.userAddress,
      to: r.profiles.userAddress,
    }),
  },
  lists: {
    entries: r.many.listEntries(),
    profile: r.one.profiles({
      from: r.lists.userAddress,
      to: r.profiles.userAddress,
    }),
  },
  listEntries: {
    list: r.one.lists({
      from: r.listEntries.listId,
      to: r.lists.id,
    }),
  },
  objektMetadata: {
    profile: r.one.profiles({
      from: r.objektMetadata.contributor,
      to: r.profiles.userAddress,
    }),
  },
  pins: {
    profile: r.one.profiles({
      from: r.pins.userAddress,
      to: r.profiles.userAddress,
    }),
  },
  gravities: {
    polls: r.many.gravityPolls(),
  },
  gravityPolls: {
    gravity: r.one.gravities({
      from: r.gravityPolls.cosmoGravityId,
      to: r.gravities.cosmoId,
      // a gravity will always exist for a poll
      optional: false,
    }),
    candidates: r.many.gravityPollCandidates(),
  },
  gravityPollCandidates: {
    poll: r.one.gravityPolls({
      from: r.gravityPollCandidates.cosmoGravityPollId,
      to: r.gravityPolls.cosmoId,
    }),
  },
}));
