import { event, fun, viewFun, indexed, ContractBase } from "@subsquid/evm-abi";
import type {
  EventParams as EParams,
  FunctionArguments,
  FunctionReturn,
} from "@subsquid/evm-abi";
import * as p from "@subsquid/evm-codec";

export const events = {
  Approval: event(
    "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
    "Approval(address,address,uint256)",
    {
      owner: indexed(p.address),
      approved: indexed(p.address),
      tokenId: indexed(p.uint256),
    },
  ),
  ApprovalForAll: event(
    "0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31",
    "ApprovalForAll(address,address,bool)",
    {
      owner: indexed(p.address),
      operator: indexed(p.address),
      approved: p.bool,
    },
  ),
  Initialized: event(
    "0xc7f505b2f371ae2175ee4913f4499e1f2633a7b5936321eed1cdaeb6115181d2",
    "Initialized(uint64)",
    { version: p.uint64 },
  ),
  RoleAdminChanged: event(
    "0xbd79b86ffe0ab8e8776151514217cd7cacd52c909f66475c3af44e129f0b00ff",
    "RoleAdminChanged(bytes32,bytes32,bytes32)",
    {
      role: indexed(p.bytes32),
      previousAdminRole: indexed(p.bytes32),
      newAdminRole: indexed(p.bytes32),
    },
  ),
  RoleGranted: event(
    "0x2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d",
    "RoleGranted(bytes32,address,address)",
    {
      role: indexed(p.bytes32),
      account: indexed(p.address),
      sender: indexed(p.address),
    },
  ),
  RoleRevoked: event(
    "0xf6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b",
    "RoleRevoked(bytes32,address,address)",
    {
      role: indexed(p.bytes32),
      account: indexed(p.address),
      sender: indexed(p.address),
    },
  ),
  Transfer: event(
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    "Transfer(address,address,uint256)",
    {
      from: indexed(p.address),
      to: indexed(p.address),
      tokenId: indexed(p.uint256),
    },
  ),
  Upgraded: event(
    "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b",
    "Upgraded(address)",
    { implementation: indexed(p.address) },
  ),
};

export const functions = {
  DEFAULT_ADMIN_ROLE: viewFun(
    "0xa217fddf",
    "DEFAULT_ADMIN_ROLE()",
    {},
    p.bytes32,
  ),
  ERROR_BLACKLISTED_MSG_SENDER: viewFun(
    "0x1111d78f",
    "ERROR_BLACKLISTED_MSG_SENDER()",
    {},
    p.string,
  ),
  ERROR_CANNOT_TRANSFER_EXTERNALLY: viewFun(
    "0xf304e990",
    "ERROR_CANNOT_TRANSFER_EXTERNALLY()",
    {},
    p.string,
  ),
  ERROR_INVALID_TOKEN_ID_RANGE: viewFun(
    "0xeab6fab3",
    "ERROR_INVALID_TOKEN_ID_RANGE()",
    {},
    p.string,
  ),
  ERROR_NON_TRANSFERABLE_OBJEKT: viewFun(
    "0x8a2969c8",
    "ERROR_NON_TRANSFERABLE_OBJEKT()",
    {},
    p.string,
  ),
  ERROR_NOT_ADMIN: viewFun("0x944565e2", "ERROR_NOT_ADMIN()", {}, p.string),
  ERROR_NOT_AUTHORIZED_APPROVAL: viewFun(
    "0xd5a40857",
    "ERROR_NOT_AUTHORIZED_APPROVAL()",
    {},
    p.string,
  ),
  ERROR_NOT_MINTER: viewFun("0x459c035e", "ERROR_NOT_MINTER()", {}, p.string),
  ERROR_ONLY_OWNER: viewFun("0x41f1162d", "ERROR_ONLY_OWNER()", {}, p.string),
  ERROR_SENDER_NOT_ADMIN: viewFun(
    "0x1abd34e2",
    "ERROR_SENDER_NOT_ADMIN()",
    {},
    p.string,
  ),
  MINTER_ROLE: viewFun("0xd5391393", "MINTER_ROLE()", {}, p.bytes32),
  OPERATOR_ROLE: viewFun("0xf5b541a6", "OPERATOR_ROLE()", {}, p.bytes32),
  UPGRADE_INTERFACE_VERSION: viewFun(
    "0xad3cb1cc",
    "UPGRADE_INTERFACE_VERSION()",
    {},
    p.string,
  ),
  approvalWhitelists: viewFun(
    "0x419e583d",
    "approvalWhitelists(address)",
    { _0: p.address },
    p.bool,
  ),
  approve: fun("0x095ea7b3", "approve(address,uint256)", {
    to: p.address,
    tokenId: p.uint256,
  }),
  balanceOf: viewFun(
    "0x70a08231",
    "balanceOf(address)",
    { owner: p.address },
    p.uint256,
  ),
  batchUpdateObjektTransferability: fun(
    "0xbf62c2e8",
    "batchUpdateObjektTransferability(uint256[],bool)",
    { tokenIds: p.array(p.uint256), transferable: p.bool },
  ),
  blacklists: viewFun(
    "0x16c02129",
    "blacklists(address)",
    { _0: p.address },
    p.bool,
  ),
  burn: fun("0x42966c68", "burn(uint256)", { tokenId: p.uint256 }),
  getApproved: viewFun(
    "0x081812fc",
    "getApproved(uint256)",
    { tokenId: p.uint256 },
    p.address,
  ),
  getRoleAdmin: viewFun(
    "0x248a9ca3",
    "getRoleAdmin(bytes32)",
    { role: p.bytes32 },
    p.bytes32,
  ),
  grantRole: fun("0x2f2ff15d", "grantRole(bytes32,address)", {
    role: p.bytes32,
    account: p.address,
  }),
  hasRole: viewFun(
    "0x91d14854",
    "hasRole(bytes32,address)",
    { role: p.bytes32, account: p.address },
    p.bool,
  ),
  initialize: fun("0xf62d1888", "initialize(string)", { baseURI_: p.string }),
  isApprovedForAll: viewFun(
    "0xe985e9c5",
    "isApprovedForAll(address,address)",
    { owner: p.address, operator: p.address },
    p.bool,
  ),
  isObjektTransferable: viewFun(
    "0xb2c03a50",
    "isObjektTransferable(uint256)",
    { _0: p.uint256 },
    p.bool,
  ),
  mint: fun("0xd1a1beb4", "mint(address,uint256,bool)", {
    to: p.address,
    tokenId: p.uint256,
    transferable: p.bool,
  }),
  mintBatch: fun("0x71c87f29", "mintBatch(address,uint256,uint256,bool)", {
    to: p.address,
    startTokenId: p.uint256,
    endTokenId: p.uint256,
    transferable: p.bool,
  }),
  name: viewFun("0x06fdde03", "name()", {}, p.string),
  ownerOf: viewFun(
    "0x6352211e",
    "ownerOf(uint256)",
    { tokenId: p.uint256 },
    p.address,
  ),
  proxiableUUID: viewFun("0x52d1902d", "proxiableUUID()", {}, p.bytes32),
  renounceRole: fun("0x36568abe", "renounceRole(bytes32,address)", {
    role: p.bytes32,
    callerConfirmation: p.address,
  }),
  revokeRole: fun("0xd547741f", "revokeRole(bytes32,address)", {
    role: p.bytes32,
    account: p.address,
  }),
  "safeTransferFrom(address,address,uint256)": fun(
    "0x42842e0e",
    "safeTransferFrom(address,address,uint256)",
    { from: p.address, to: p.address, tokenId: p.uint256 },
  ),
  "safeTransferFrom(address,address,uint256,bytes)": fun(
    "0xb88d4fde",
    "safeTransferFrom(address,address,uint256,bytes)",
    { from: p.address, to: p.address, tokenId: p.uint256, data: p.bytes },
  ),
  setApprovalForAll: fun("0xa22cb465", "setApprovalForAll(address,bool)", {
    operator: p.address,
    approved: p.bool,
  }),
  setApprovalWhitelist: fun(
    "0xca0429e0",
    "setApprovalWhitelist(address,bool)",
    { addr: p.address, isWhitelisted: p.bool },
  ),
  setBaseURI: fun("0x55f804b3", "setBaseURI(string)", {
    _newBaseURI: p.string,
  }),
  setBlacklist: fun("0x153b0d1e", "setBlacklist(address,bool)", {
    addr: p.address,
    isBlacklisted: p.bool,
  }),
  supportsInterface: viewFun(
    "0x01ffc9a7",
    "supportsInterface(bytes4)",
    { interfaceId: p.bytes4 },
    p.bool,
  ),
  symbol: viewFun("0x95d89b41", "symbol()", {}, p.string),
  tokenByIndex: viewFun(
    "0x4f6ccce7",
    "tokenByIndex(uint256)",
    { index: p.uint256 },
    p.uint256,
  ),
  tokenOfOwnerByIndex: viewFun(
    "0x2f745c59",
    "tokenOfOwnerByIndex(address,uint256)",
    { owner: p.address, index: p.uint256 },
    p.uint256,
  ),
  tokenURI: viewFun(
    "0xc87b56dd",
    "tokenURI(uint256)",
    { tokenId: p.uint256 },
    p.string,
  ),
  totalSupply: viewFun("0x18160ddd", "totalSupply()", {}, p.uint256),
  transferFrom: fun("0x23b872dd", "transferFrom(address,address,uint256)", {
    from: p.address,
    to: p.address,
    tokenId: p.uint256,
  }),
  upgradeToAndCall: fun("0x4f1ef286", "upgradeToAndCall(address,bytes)", {
    newImplementation: p.address,
    data: p.bytes,
  }),
};

export class Contract extends ContractBase {
  DEFAULT_ADMIN_ROLE() {
    return this.eth_call(functions.DEFAULT_ADMIN_ROLE, {});
  }

  ERROR_BLACKLISTED_MSG_SENDER() {
    return this.eth_call(functions.ERROR_BLACKLISTED_MSG_SENDER, {});
  }

  ERROR_CANNOT_TRANSFER_EXTERNALLY() {
    return this.eth_call(functions.ERROR_CANNOT_TRANSFER_EXTERNALLY, {});
  }

  ERROR_INVALID_TOKEN_ID_RANGE() {
    return this.eth_call(functions.ERROR_INVALID_TOKEN_ID_RANGE, {});
  }

  ERROR_NON_TRANSFERABLE_OBJEKT() {
    return this.eth_call(functions.ERROR_NON_TRANSFERABLE_OBJEKT, {});
  }

  ERROR_NOT_ADMIN() {
    return this.eth_call(functions.ERROR_NOT_ADMIN, {});
  }

  ERROR_NOT_AUTHORIZED_APPROVAL() {
    return this.eth_call(functions.ERROR_NOT_AUTHORIZED_APPROVAL, {});
  }

  ERROR_NOT_MINTER() {
    return this.eth_call(functions.ERROR_NOT_MINTER, {});
  }

  ERROR_ONLY_OWNER() {
    return this.eth_call(functions.ERROR_ONLY_OWNER, {});
  }

  ERROR_SENDER_NOT_ADMIN() {
    return this.eth_call(functions.ERROR_SENDER_NOT_ADMIN, {});
  }

  MINTER_ROLE() {
    return this.eth_call(functions.MINTER_ROLE, {});
  }

  OPERATOR_ROLE() {
    return this.eth_call(functions.OPERATOR_ROLE, {});
  }

  UPGRADE_INTERFACE_VERSION() {
    return this.eth_call(functions.UPGRADE_INTERFACE_VERSION, {});
  }

  approvalWhitelists(_0: ApprovalWhitelistsParams["_0"]) {
    return this.eth_call(functions.approvalWhitelists, { _0 });
  }

  balanceOf(owner: BalanceOfParams["owner"]) {
    return this.eth_call(functions.balanceOf, { owner });
  }

  blacklists(_0: BlacklistsParams["_0"]) {
    return this.eth_call(functions.blacklists, { _0 });
  }

  getApproved(tokenId: GetApprovedParams["tokenId"]) {
    return this.eth_call(functions.getApproved, { tokenId });
  }

  getRoleAdmin(role: GetRoleAdminParams["role"]) {
    return this.eth_call(functions.getRoleAdmin, { role });
  }

  hasRole(role: HasRoleParams["role"], account: HasRoleParams["account"]) {
    return this.eth_call(functions.hasRole, { role, account });
  }

  isApprovedForAll(
    owner: IsApprovedForAllParams["owner"],
    operator: IsApprovedForAllParams["operator"],
  ) {
    return this.eth_call(functions.isApprovedForAll, { owner, operator });
  }

  isObjektTransferable(_0: IsObjektTransferableParams["_0"]) {
    return this.eth_call(functions.isObjektTransferable, { _0 });
  }

  name() {
    return this.eth_call(functions.name, {});
  }

  ownerOf(tokenId: OwnerOfParams["tokenId"]) {
    return this.eth_call(functions.ownerOf, { tokenId });
  }

  proxiableUUID() {
    return this.eth_call(functions.proxiableUUID, {});
  }

  supportsInterface(interfaceId: SupportsInterfaceParams["interfaceId"]) {
    return this.eth_call(functions.supportsInterface, { interfaceId });
  }

  symbol() {
    return this.eth_call(functions.symbol, {});
  }

  tokenByIndex(index: TokenByIndexParams["index"]) {
    return this.eth_call(functions.tokenByIndex, { index });
  }

  tokenOfOwnerByIndex(
    owner: TokenOfOwnerByIndexParams["owner"],
    index: TokenOfOwnerByIndexParams["index"],
  ) {
    return this.eth_call(functions.tokenOfOwnerByIndex, { owner, index });
  }

  tokenURI(tokenId: TokenURIParams["tokenId"]) {
    return this.eth_call(functions.tokenURI, { tokenId });
  }

  totalSupply() {
    return this.eth_call(functions.totalSupply, {});
  }
}

/// Event types
export type ApprovalEventArgs = EParams<typeof events.Approval>;
export type ApprovalForAllEventArgs = EParams<typeof events.ApprovalForAll>;
export type InitializedEventArgs = EParams<typeof events.Initialized>;
export type RoleAdminChangedEventArgs = EParams<typeof events.RoleAdminChanged>;
export type RoleGrantedEventArgs = EParams<typeof events.RoleGranted>;
export type RoleRevokedEventArgs = EParams<typeof events.RoleRevoked>;
export type TransferEventArgs = EParams<typeof events.Transfer>;
export type UpgradedEventArgs = EParams<typeof events.Upgraded>;

/// Function types
export type DEFAULT_ADMIN_ROLEParams = FunctionArguments<
  typeof functions.DEFAULT_ADMIN_ROLE
>;
export type DEFAULT_ADMIN_ROLEReturn = FunctionReturn<
  typeof functions.DEFAULT_ADMIN_ROLE
>;

export type ERROR_BLACKLISTED_MSG_SENDERParams = FunctionArguments<
  typeof functions.ERROR_BLACKLISTED_MSG_SENDER
>;
export type ERROR_BLACKLISTED_MSG_SENDERReturn = FunctionReturn<
  typeof functions.ERROR_BLACKLISTED_MSG_SENDER
>;

export type ERROR_CANNOT_TRANSFER_EXTERNALLYParams = FunctionArguments<
  typeof functions.ERROR_CANNOT_TRANSFER_EXTERNALLY
>;
export type ERROR_CANNOT_TRANSFER_EXTERNALLYReturn = FunctionReturn<
  typeof functions.ERROR_CANNOT_TRANSFER_EXTERNALLY
>;

export type ERROR_INVALID_TOKEN_ID_RANGEParams = FunctionArguments<
  typeof functions.ERROR_INVALID_TOKEN_ID_RANGE
>;
export type ERROR_INVALID_TOKEN_ID_RANGEReturn = FunctionReturn<
  typeof functions.ERROR_INVALID_TOKEN_ID_RANGE
>;

export type ERROR_NON_TRANSFERABLE_OBJEKTParams = FunctionArguments<
  typeof functions.ERROR_NON_TRANSFERABLE_OBJEKT
>;
export type ERROR_NON_TRANSFERABLE_OBJEKTReturn = FunctionReturn<
  typeof functions.ERROR_NON_TRANSFERABLE_OBJEKT
>;

export type ERROR_NOT_ADMINParams = FunctionArguments<
  typeof functions.ERROR_NOT_ADMIN
>;
export type ERROR_NOT_ADMINReturn = FunctionReturn<
  typeof functions.ERROR_NOT_ADMIN
>;

export type ERROR_NOT_AUTHORIZED_APPROVALParams = FunctionArguments<
  typeof functions.ERROR_NOT_AUTHORIZED_APPROVAL
>;
export type ERROR_NOT_AUTHORIZED_APPROVALReturn = FunctionReturn<
  typeof functions.ERROR_NOT_AUTHORIZED_APPROVAL
>;

export type ERROR_NOT_MINTERParams = FunctionArguments<
  typeof functions.ERROR_NOT_MINTER
>;
export type ERROR_NOT_MINTERReturn = FunctionReturn<
  typeof functions.ERROR_NOT_MINTER
>;

export type ERROR_ONLY_OWNERParams = FunctionArguments<
  typeof functions.ERROR_ONLY_OWNER
>;
export type ERROR_ONLY_OWNERReturn = FunctionReturn<
  typeof functions.ERROR_ONLY_OWNER
>;

export type ERROR_SENDER_NOT_ADMINParams = FunctionArguments<
  typeof functions.ERROR_SENDER_NOT_ADMIN
>;
export type ERROR_SENDER_NOT_ADMINReturn = FunctionReturn<
  typeof functions.ERROR_SENDER_NOT_ADMIN
>;

export type MINTER_ROLEParams = FunctionArguments<typeof functions.MINTER_ROLE>;
export type MINTER_ROLEReturn = FunctionReturn<typeof functions.MINTER_ROLE>;

export type OPERATOR_ROLEParams = FunctionArguments<
  typeof functions.OPERATOR_ROLE
>;
export type OPERATOR_ROLEReturn = FunctionReturn<
  typeof functions.OPERATOR_ROLE
>;

export type UPGRADE_INTERFACE_VERSIONParams = FunctionArguments<
  typeof functions.UPGRADE_INTERFACE_VERSION
>;
export type UPGRADE_INTERFACE_VERSIONReturn = FunctionReturn<
  typeof functions.UPGRADE_INTERFACE_VERSION
>;

export type ApprovalWhitelistsParams = FunctionArguments<
  typeof functions.approvalWhitelists
>;
export type ApprovalWhitelistsReturn = FunctionReturn<
  typeof functions.approvalWhitelists
>;

export type ApproveParams = FunctionArguments<typeof functions.approve>;
export type ApproveReturn = FunctionReturn<typeof functions.approve>;

export type BalanceOfParams = FunctionArguments<typeof functions.balanceOf>;
export type BalanceOfReturn = FunctionReturn<typeof functions.balanceOf>;

export type BatchUpdateObjektTransferabilityParams = FunctionArguments<
  typeof functions.batchUpdateObjektTransferability
>;
export type BatchUpdateObjektTransferabilityReturn = FunctionReturn<
  typeof functions.batchUpdateObjektTransferability
>;

export type BlacklistsParams = FunctionArguments<typeof functions.blacklists>;
export type BlacklistsReturn = FunctionReturn<typeof functions.blacklists>;

export type BurnParams = FunctionArguments<typeof functions.burn>;
export type BurnReturn = FunctionReturn<typeof functions.burn>;

export type GetApprovedParams = FunctionArguments<typeof functions.getApproved>;
export type GetApprovedReturn = FunctionReturn<typeof functions.getApproved>;

export type GetRoleAdminParams = FunctionArguments<
  typeof functions.getRoleAdmin
>;
export type GetRoleAdminReturn = FunctionReturn<typeof functions.getRoleAdmin>;

export type GrantRoleParams = FunctionArguments<typeof functions.grantRole>;
export type GrantRoleReturn = FunctionReturn<typeof functions.grantRole>;

export type HasRoleParams = FunctionArguments<typeof functions.hasRole>;
export type HasRoleReturn = FunctionReturn<typeof functions.hasRole>;

export type InitializeParams = FunctionArguments<typeof functions.initialize>;
export type InitializeReturn = FunctionReturn<typeof functions.initialize>;

export type IsApprovedForAllParams = FunctionArguments<
  typeof functions.isApprovedForAll
>;
export type IsApprovedForAllReturn = FunctionReturn<
  typeof functions.isApprovedForAll
>;

export type IsObjektTransferableParams = FunctionArguments<
  typeof functions.isObjektTransferable
>;
export type IsObjektTransferableReturn = FunctionReturn<
  typeof functions.isObjektTransferable
>;

export type MintParams = FunctionArguments<typeof functions.mint>;
export type MintReturn = FunctionReturn<typeof functions.mint>;

export type MintBatchParams = FunctionArguments<typeof functions.mintBatch>;
export type MintBatchReturn = FunctionReturn<typeof functions.mintBatch>;

export type NameParams = FunctionArguments<typeof functions.name>;
export type NameReturn = FunctionReturn<typeof functions.name>;

export type OwnerOfParams = FunctionArguments<typeof functions.ownerOf>;
export type OwnerOfReturn = FunctionReturn<typeof functions.ownerOf>;

export type ProxiableUUIDParams = FunctionArguments<
  typeof functions.proxiableUUID
>;
export type ProxiableUUIDReturn = FunctionReturn<
  typeof functions.proxiableUUID
>;

export type RenounceRoleParams = FunctionArguments<
  typeof functions.renounceRole
>;
export type RenounceRoleReturn = FunctionReturn<typeof functions.renounceRole>;

export type RevokeRoleParams = FunctionArguments<typeof functions.revokeRole>;
export type RevokeRoleReturn = FunctionReturn<typeof functions.revokeRole>;

export type SafeTransferFromParams_0 = FunctionArguments<
  (typeof functions)["safeTransferFrom(address,address,uint256)"]
>;
export type SafeTransferFromReturn_0 = FunctionReturn<
  (typeof functions)["safeTransferFrom(address,address,uint256)"]
>;

export type SafeTransferFromParams_1 = FunctionArguments<
  (typeof functions)["safeTransferFrom(address,address,uint256,bytes)"]
>;
export type SafeTransferFromReturn_1 = FunctionReturn<
  (typeof functions)["safeTransferFrom(address,address,uint256,bytes)"]
>;

export type SetApprovalForAllParams = FunctionArguments<
  typeof functions.setApprovalForAll
>;
export type SetApprovalForAllReturn = FunctionReturn<
  typeof functions.setApprovalForAll
>;

export type SetApprovalWhitelistParams = FunctionArguments<
  typeof functions.setApprovalWhitelist
>;
export type SetApprovalWhitelistReturn = FunctionReturn<
  typeof functions.setApprovalWhitelist
>;

export type SetBaseURIParams = FunctionArguments<typeof functions.setBaseURI>;
export type SetBaseURIReturn = FunctionReturn<typeof functions.setBaseURI>;

export type SetBlacklistParams = FunctionArguments<
  typeof functions.setBlacklist
>;
export type SetBlacklistReturn = FunctionReturn<typeof functions.setBlacklist>;

export type SupportsInterfaceParams = FunctionArguments<
  typeof functions.supportsInterface
>;
export type SupportsInterfaceReturn = FunctionReturn<
  typeof functions.supportsInterface
>;

export type SymbolParams = FunctionArguments<typeof functions.symbol>;
export type SymbolReturn = FunctionReturn<typeof functions.symbol>;

export type TokenByIndexParams = FunctionArguments<
  typeof functions.tokenByIndex
>;
export type TokenByIndexReturn = FunctionReturn<typeof functions.tokenByIndex>;

export type TokenOfOwnerByIndexParams = FunctionArguments<
  typeof functions.tokenOfOwnerByIndex
>;
export type TokenOfOwnerByIndexReturn = FunctionReturn<
  typeof functions.tokenOfOwnerByIndex
>;

export type TokenURIParams = FunctionArguments<typeof functions.tokenURI>;
export type TokenURIReturn = FunctionReturn<typeof functions.tokenURI>;

export type TotalSupplyParams = FunctionArguments<typeof functions.totalSupply>;
export type TotalSupplyReturn = FunctionReturn<typeof functions.totalSupply>;

export type TransferFromParams = FunctionArguments<
  typeof functions.transferFrom
>;
export type TransferFromReturn = FunctionReturn<typeof functions.transferFrom>;

export type UpgradeToAndCallParams = FunctionArguments<
  typeof functions.upgradeToAndCall
>;
export type UpgradeToAndCallReturn = FunctionReturn<
  typeof functions.upgradeToAndCall
>;
