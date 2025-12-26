import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  cosmoAccounts: {
    lockedObjekts: r.many.lockedObjekts(),
    objektMetadata: r.many.objektMetadata(),
    pins: r.many.pins(),
    user: r.one.user({
      from: r.cosmoAccounts.userId,
      to: r.user.id,
    }),
    objektLists: r.many.objektLists({
      from: r.cosmoAccounts.userId,
      to: r.objektLists.userId,
    }),
    polygonVotes: r.many.polygonVotes({
      from: r.cosmoAccounts.polygonAddress,
      to: r.polygonVotes.address,
    }),
    idChanges: r.many.cosmoAccountChanges({
      from: r.cosmoAccounts.address,
      to: r.cosmoAccountChanges.address,
    }),
  },
  lockedObjekts: {
    profile: r.one.cosmoAccounts({
      from: r.lockedObjekts.address,
      to: r.cosmoAccounts.address,
    }),
  },
  pins: {
    profile: r.one.cosmoAccounts({
      from: r.pins.address,
      to: r.cosmoAccounts.address,
    }),
  },
  objektMetadata: {
    profile: r.one.cosmoAccounts({
      from: r.objektMetadata.contributor,
      to: r.cosmoAccounts.address,
    }),
  },
  objektLists: {
    entries: r.many.objektListEntries(),
    user: r.one.user({
      from: r.objektLists.userId,
      to: r.user.id,
      optional: false,
    }),
    cosmoAccount: r.one.cosmoAccounts({
      from: r.objektLists.userId,
      to: r.cosmoAccounts.userId,
    }),
  },
  objektListEntries: {
    list: r.one.objektLists({
      from: r.objektListEntries.objektListId,
      to: r.objektLists.id,
    }),
  },
  cosmoTokens: {},
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
  polygonVotes: {
    cosmoAccount: r.one.cosmoAccounts({
      from: r.polygonVotes.address,
      to: r.cosmoAccounts.polygonAddress,
    }),
  },
  user: {
    sessions: r.many.session(),
    accounts: r.many.account(),
    cosmoAccount: r.one.cosmoAccounts({
      from: r.user.id,
      to: r.cosmoAccounts.userId,
    }),
    objektLists: r.many.objektLists(),
  },
  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },
  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
    }),
  },
  // #region Events/Drops System
  eras: {
    events: r.many.events(),
  },
  events: {
    era: r.one.eras({
      from: r.events.eraId,
      to: r.eras.id,
      optional: false,
    }),
    collections: r.many.eventCollections(),
  },
  eventCollections: {
    event: r.one.events({
      from: r.eventCollections.eventId,
      to: r.events.id,
      optional: false,
    }),
  },
  // #endregion

  // #region Legacy
  lists: {
    entries: r.many.listEntries(),
    profile: r.one.cosmoAccounts({
      from: r.lists.userAddress,
      to: r.cosmoAccounts.address,
    }),
  },
  listEntries: {
    list: r.one.lists({
      from: r.listEntries.listId,
      to: r.lists.id,
    }),
  },
  // #endregion
}));
