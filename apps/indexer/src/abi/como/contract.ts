import { ContractBase } from "../abi.support.js";
import {
  DEFAULT_ADMIN_ROLE,
  ERROR_ALREADY_WHITELISTED,
  ERROR_TO_ADDRESS_NOT_IN_WHITELIST,
  ERROR_WHITELIST_ALREADY_REMOVED,
  ERROR_WHITELIST_NOT_INITIALIZED,
  MANAGER_ROLE,
  MINTER_ROLE,
  TRANSFERER_ROLE,
  UPGRADE_INTERFACE_VERSION,
  balanceOf,
  balanceOfBatch,
  getRoleAdmin,
  hasRole,
  isApprovedForAll,
  proxiableUUID,
  supportsInterface,
  uri,
  whitelists,
} from "./functions.js";
import type {
  BalanceOfBatchParams,
  BalanceOfParams,
  GetRoleAdminParams,
  HasRoleParams,
  IsApprovedForAllParams,
  SupportsInterfaceParams,
  UriParams,
  WhitelistsParams,
} from "./functions.js";

export class Contract extends ContractBase {
  DEFAULT_ADMIN_ROLE() {
    return this.eth_call(DEFAULT_ADMIN_ROLE, {});
  }

  ERROR_ALREADY_WHITELISTED() {
    return this.eth_call(ERROR_ALREADY_WHITELISTED, {});
  }

  ERROR_TO_ADDRESS_NOT_IN_WHITELIST() {
    return this.eth_call(ERROR_TO_ADDRESS_NOT_IN_WHITELIST, {});
  }

  ERROR_WHITELIST_ALREADY_REMOVED() {
    return this.eth_call(ERROR_WHITELIST_ALREADY_REMOVED, {});
  }

  ERROR_WHITELIST_NOT_INITIALIZED() {
    return this.eth_call(ERROR_WHITELIST_NOT_INITIALIZED, {});
  }

  MANAGER_ROLE() {
    return this.eth_call(MANAGER_ROLE, {});
  }

  MINTER_ROLE() {
    return this.eth_call(MINTER_ROLE, {});
  }

  TRANSFERER_ROLE() {
    return this.eth_call(TRANSFERER_ROLE, {});
  }

  UPGRADE_INTERFACE_VERSION() {
    return this.eth_call(UPGRADE_INTERFACE_VERSION, {});
  }

  balanceOf(account: BalanceOfParams["account"], id: BalanceOfParams["id"]) {
    return this.eth_call(balanceOf, { account, id });
  }

  balanceOfBatch(
    accounts: BalanceOfBatchParams["accounts"],
    ids: BalanceOfBatchParams["ids"],
  ) {
    return this.eth_call(balanceOfBatch, { accounts, ids });
  }

  getRoleAdmin(role: GetRoleAdminParams["role"]) {
    return this.eth_call(getRoleAdmin, { role });
  }

  hasRole(role: HasRoleParams["role"], account: HasRoleParams["account"]) {
    return this.eth_call(hasRole, { role, account });
  }

  isApprovedForAll(
    account: IsApprovedForAllParams["account"],
    operator: IsApprovedForAllParams["operator"],
  ) {
    return this.eth_call(isApprovedForAll, { account, operator });
  }

  proxiableUUID() {
    return this.eth_call(proxiableUUID, {});
  }

  supportsInterface(interfaceId: SupportsInterfaceParams["interfaceId"]) {
    return this.eth_call(supportsInterface, { interfaceId });
  }

  uri(id: UriParams["id"]) {
    return this.eth_call(uri, { id });
  }

  whitelists(_0: WhitelistsParams["_0"]) {
    return this.eth_call(whitelists, { _0 });
  }
}
