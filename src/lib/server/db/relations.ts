import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  // #region Legacy
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
  pins: {
    profile: r.one.profiles({
      from: r.pins.userAddress,
      to: r.profiles.userAddress,
    }),
  },
  // #endregion
  objektMetadata: {
    profile: r.one.profiles({
      from: r.objektMetadata.contributor,
      to: r.profiles.userAddress,
    }),
  },
  objektLists: {
    entries: r.many.objektListEntries(),
    user: r.one.user({
      from: r.objektLists.userId,
      to: r.user.id,
    }),
  },
  objektListEntries: {
    list: r.one.objektLists({
      from: r.objektListEntries.objektListId,
      to: r.objektLists.id,
    }),
  },
  cosmoTokens: {},
  users: {
    sessions: r.many.session(),
    accounts: r.many.account(),
    verifications: r.many.verification(),
  },
  sessions: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },
  accounts: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
    }),
  },
}));
