import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  cosmoAccounts: {
    lockedObjekts: r.many.lockedObjekts(),
    lists: r.many.lists(),
    objektMetadata: r.many.objektMetadata(),
    pins: r.many.pins(),
    user: r.one.user({
      from: r.cosmoAccounts.userId,
      to: r.user.id,
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
    }),
  },
  objektListEntries: {
    list: r.one.objektLists({
      from: r.objektListEntries.objektListId,
      to: r.objektLists.id,
    }),
  },
  cosmoTokens: {},
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
