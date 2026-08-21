import { ContractBase } from "../abi.support.js";
import {
  DEFAULT_ADMIN_ROLE,
  ERROR_BLACKLISTED_MSG_SENDER,
  ERROR_CANNOT_TRANSFER_EXTERNALLY,
  ERROR_INVALID_TOKEN_ID_RANGE,
  ERROR_NON_TRANSFERABLE_OBJEKT,
  ERROR_NOT_ADMIN,
  ERROR_NOT_AUTHORIZED_APPROVAL,
  ERROR_NOT_MINTER,
  ERROR_ONLY_OWNER,
  ERROR_SENDER_NOT_ADMIN,
  MINTER_ROLE,
  OPERATOR_ROLE,
  UPGRADE_INTERFACE_VERSION,
  approvalWhitelists,
  balanceOf,
  blacklists,
  getApproved,
  getRoleAdmin,
  hasRole,
  isApprovedForAll,
  isObjektTransferable,
  name,
  ownerOf,
  proxiableUUID,
  supportsInterface,
  symbol,
  tokenByIndex,
  tokenOfOwnerByIndex,
  tokenURI,
  totalSupply,
} from "./functions.js";
import type {
  ApprovalWhitelistsParams,
  BalanceOfParams,
  BlacklistsParams,
  GetApprovedParams,
  GetRoleAdminParams,
  HasRoleParams,
  IsApprovedForAllParams,
  IsObjektTransferableParams,
  OwnerOfParams,
  SupportsInterfaceParams,
  TokenByIndexParams,
  TokenOfOwnerByIndexParams,
  TokenURIParams,
} from "./functions.js";

export class Contract extends ContractBase {
  DEFAULT_ADMIN_ROLE() {
    return this.eth_call(DEFAULT_ADMIN_ROLE, {});
  }

  ERROR_BLACKLISTED_MSG_SENDER() {
    return this.eth_call(ERROR_BLACKLISTED_MSG_SENDER, {});
  }

  ERROR_CANNOT_TRANSFER_EXTERNALLY() {
    return this.eth_call(ERROR_CANNOT_TRANSFER_EXTERNALLY, {});
  }

  ERROR_INVALID_TOKEN_ID_RANGE() {
    return this.eth_call(ERROR_INVALID_TOKEN_ID_RANGE, {});
  }

  ERROR_NON_TRANSFERABLE_OBJEKT() {
    return this.eth_call(ERROR_NON_TRANSFERABLE_OBJEKT, {});
  }

  ERROR_NOT_ADMIN() {
    return this.eth_call(ERROR_NOT_ADMIN, {});
  }

  ERROR_NOT_AUTHORIZED_APPROVAL() {
    return this.eth_call(ERROR_NOT_AUTHORIZED_APPROVAL, {});
  }

  ERROR_NOT_MINTER() {
    return this.eth_call(ERROR_NOT_MINTER, {});
  }

  ERROR_ONLY_OWNER() {
    return this.eth_call(ERROR_ONLY_OWNER, {});
  }

  ERROR_SENDER_NOT_ADMIN() {
    return this.eth_call(ERROR_SENDER_NOT_ADMIN, {});
  }

  MINTER_ROLE() {
    return this.eth_call(MINTER_ROLE, {});
  }

  OPERATOR_ROLE() {
    return this.eth_call(OPERATOR_ROLE, {});
  }

  UPGRADE_INTERFACE_VERSION() {
    return this.eth_call(UPGRADE_INTERFACE_VERSION, {});
  }

  approvalWhitelists(_0: ApprovalWhitelistsParams["_0"]) {
    return this.eth_call(approvalWhitelists, { _0 });
  }

  balanceOf(owner: BalanceOfParams["owner"]) {
    return this.eth_call(balanceOf, { owner });
  }

  blacklists(_0: BlacklistsParams["_0"]) {
    return this.eth_call(blacklists, { _0 });
  }

  getApproved(tokenId: GetApprovedParams["tokenId"]) {
    return this.eth_call(getApproved, { tokenId });
  }

  getRoleAdmin(role: GetRoleAdminParams["role"]) {
    return this.eth_call(getRoleAdmin, { role });
  }

  hasRole(role: HasRoleParams["role"], account: HasRoleParams["account"]) {
    return this.eth_call(hasRole, { role, account });
  }

  isApprovedForAll(
    owner: IsApprovedForAllParams["owner"],
    operator: IsApprovedForAllParams["operator"],
  ) {
    return this.eth_call(isApprovedForAll, { owner, operator });
  }

  isObjektTransferable(_0: IsObjektTransferableParams["_0"]) {
    return this.eth_call(isObjektTransferable, { _0 });
  }

  name() {
    return this.eth_call(name, {});
  }

  ownerOf(tokenId: OwnerOfParams["tokenId"]) {
    return this.eth_call(ownerOf, { tokenId });
  }

  proxiableUUID() {
    return this.eth_call(proxiableUUID, {});
  }

  supportsInterface(interfaceId: SupportsInterfaceParams["interfaceId"]) {
    return this.eth_call(supportsInterface, { interfaceId });
  }

  symbol() {
    return this.eth_call(symbol, {});
  }

  tokenByIndex(index: TokenByIndexParams["index"]) {
    return this.eth_call(tokenByIndex, { index });
  }

  tokenOfOwnerByIndex(
    owner: TokenOfOwnerByIndexParams["owner"],
    index: TokenOfOwnerByIndexParams["index"],
  ) {
    return this.eth_call(tokenOfOwnerByIndex, { owner, index });
  }

  tokenURI(tokenId: TokenURIParams["tokenId"]) {
    return this.eth_call(tokenURI, { tokenId });
  }

  totalSupply() {
    return this.eth_call(totalSupply, {});
  }
}
