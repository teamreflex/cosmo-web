import { event, fun, viewFun, indexed, ContractBase } from "@subsquid/evm-abi";
import type {
  EventParams as EParams,
  FunctionArguments,
  FunctionReturn,
} from "@subsquid/evm-abi";
import * as p from "@subsquid/evm-codec";

export const events = {
  ApprovalForAll: event(
    "0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31",
    "ApprovalForAll(address,address,bool)",
    {
      account: indexed(p.address),
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
  TransferBatch: event(
    "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb",
    "TransferBatch(address,address,address,uint256[],uint256[])",
    {
      operator: indexed(p.address),
      from: indexed(p.address),
      to: indexed(p.address),
      ids: p.array(p.uint256),
      values: p.array(p.uint256),
    },
  ),
  TransferSingle: event(
    "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62",
    "TransferSingle(address,address,address,uint256,uint256)",
    {
      operator: indexed(p.address),
      from: indexed(p.address),
      to: indexed(p.address),
      id: p.uint256,
      value: p.uint256,
    },
  ),
  URI: event(
    "0x6bb7ff708619ba0610cba295a58592e0451dee2622938c8755667688daf3529b",
    "URI(string,uint256)",
    { value: p.string, id: indexed(p.uint256) },
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
  ERROR_ALREADY_WHITELISTED: viewFun(
    "0x4b691084",
    "ERROR_ALREADY_WHITELISTED()",
    {},
    p.string,
  ),
  ERROR_TO_ADDRESS_NOT_IN_WHITELIST: viewFun(
    "0xc120e7ca",
    "ERROR_TO_ADDRESS_NOT_IN_WHITELIST()",
    {},
    p.string,
  ),
  ERROR_WHITELIST_ALREADY_REMOVED: viewFun(
    "0xa5813f57",
    "ERROR_WHITELIST_ALREADY_REMOVED()",
    {},
    p.string,
  ),
  ERROR_WHITELIST_NOT_INITIALIZED: viewFun(
    "0xf1af1e75",
    "ERROR_WHITELIST_NOT_INITIALIZED()",
    {},
    p.string,
  ),
  MANAGER_ROLE: viewFun("0xec87621c", "MANAGER_ROLE()", {}, p.bytes32),
  MINTER_ROLE: viewFun("0xd5391393", "MINTER_ROLE()", {}, p.bytes32),
  TRANSFERER_ROLE: viewFun("0x0ade7dc1", "TRANSFERER_ROLE()", {}, p.bytes32),
  UPGRADE_INTERFACE_VERSION: viewFun(
    "0xad3cb1cc",
    "UPGRADE_INTERFACE_VERSION()",
    {},
    p.string,
  ),
  addWhitelist: fun("0x3e0b892a", "addWhitelist(uint256,address)", {
    id: p.uint256,
    addr: p.address,
  }),
  balanceOf: viewFun(
    "0x00fdd58e",
    "balanceOf(address,uint256)",
    { account: p.address, id: p.uint256 },
    p.uint256,
  ),
  balanceOfBatch: viewFun(
    "0x4e1273f4",
    "balanceOfBatch(address[],uint256[])",
    { accounts: p.array(p.address), ids: p.array(p.uint256) },
    p.array(p.uint256),
  ),
  burn: fun("0xf5298aca", "burn(address,uint256,uint256)", {
    account: p.address,
    id: p.uint256,
    value: p.uint256,
  }),
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
  initialize: fun("0xf62d1888", "initialize(string)", { uri: p.string }),
  isApprovedForAll: viewFun(
    "0xe985e9c5",
    "isApprovedForAll(address,address)",
    { account: p.address, operator: p.address },
    p.bool,
  ),
  mint: fun("0x731133e9", "mint(address,uint256,uint256,bytes)", {
    to: p.address,
    id: p.uint256,
    amount: p.uint256,
    data: p.bytes,
  }),
  mintBatch: fun("0x1f7fdffa", "mintBatch(address,uint256[],uint256[],bytes)", {
    to: p.address,
    ids: p.array(p.uint256),
    amounts: p.array(p.uint256),
    data: p.bytes,
  }),
  proxiableUUID: viewFun("0x52d1902d", "proxiableUUID()", {}, p.bytes32),
  removeWhitelist: fun("0x94008a6e", "removeWhitelist(uint256,address)", {
    id: p.uint256,
    addr: p.address,
  }),
  renounceRole: fun("0x36568abe", "renounceRole(bytes32,address)", {
    role: p.bytes32,
    callerConfirmation: p.address,
  }),
  revokeRole: fun("0xd547741f", "revokeRole(bytes32,address)", {
    role: p.bytes32,
    account: p.address,
  }),
  safeBatchTransferFrom: fun(
    "0x2eb2c2d6",
    "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)",
    {
      from: p.address,
      to: p.address,
      ids: p.array(p.uint256),
      values: p.array(p.uint256),
      data: p.bytes,
    },
  ),
  safeTransferFrom: fun(
    "0xf242432a",
    "safeTransferFrom(address,address,uint256,uint256,bytes)",
    {
      from: p.address,
      to: p.address,
      id: p.uint256,
      value: p.uint256,
      data: p.bytes,
    },
  ),
  setApprovalForAll: fun("0xa22cb465", "setApprovalForAll(address,bool)", {
    operator: p.address,
    approved: p.bool,
  }),
  setURI: fun("0x02fe5305", "setURI(string)", { uri: p.string }),
  setWhitelistCheck: fun("0xfcbb42ef", "setWhitelistCheck(uint256,bool)", {
    id: p.uint256,
    isWhitelistCheckEnabled: p.bool,
  }),
  supportsInterface: viewFun(
    "0x01ffc9a7",
    "supportsInterface(bytes4)",
    { interfaceId: p.bytes4 },
    p.bool,
  ),
  upgradeToAndCall: fun("0x4f1ef286", "upgradeToAndCall(address,bytes)", {
    newImplementation: p.address,
    data: p.bytes,
  }),
  uri: viewFun("0x0e89341c", "uri(uint256)", { id: p.uint256 }, p.string),
  whitelists: viewFun(
    "0xfe4d5add",
    "whitelists(uint256)",
    { _0: p.uint256 },
    p.bool,
  ),
};

export class Contract extends ContractBase {
  DEFAULT_ADMIN_ROLE() {
    return this.eth_call(functions.DEFAULT_ADMIN_ROLE, {});
  }

  ERROR_ALREADY_WHITELISTED() {
    return this.eth_call(functions.ERROR_ALREADY_WHITELISTED, {});
  }

  ERROR_TO_ADDRESS_NOT_IN_WHITELIST() {
    return this.eth_call(functions.ERROR_TO_ADDRESS_NOT_IN_WHITELIST, {});
  }

  ERROR_WHITELIST_ALREADY_REMOVED() {
    return this.eth_call(functions.ERROR_WHITELIST_ALREADY_REMOVED, {});
  }

  ERROR_WHITELIST_NOT_INITIALIZED() {
    return this.eth_call(functions.ERROR_WHITELIST_NOT_INITIALIZED, {});
  }

  MANAGER_ROLE() {
    return this.eth_call(functions.MANAGER_ROLE, {});
  }

  MINTER_ROLE() {
    return this.eth_call(functions.MINTER_ROLE, {});
  }

  TRANSFERER_ROLE() {
    return this.eth_call(functions.TRANSFERER_ROLE, {});
  }

  UPGRADE_INTERFACE_VERSION() {
    return this.eth_call(functions.UPGRADE_INTERFACE_VERSION, {});
  }

  balanceOf(account: BalanceOfParams["account"], id: BalanceOfParams["id"]) {
    return this.eth_call(functions.balanceOf, { account, id });
  }

  balanceOfBatch(
    accounts: BalanceOfBatchParams["accounts"],
    ids: BalanceOfBatchParams["ids"],
  ) {
    return this.eth_call(functions.balanceOfBatch, { accounts, ids });
  }

  getRoleAdmin(role: GetRoleAdminParams["role"]) {
    return this.eth_call(functions.getRoleAdmin, { role });
  }

  hasRole(role: HasRoleParams["role"], account: HasRoleParams["account"]) {
    return this.eth_call(functions.hasRole, { role, account });
  }

  isApprovedForAll(
    account: IsApprovedForAllParams["account"],
    operator: IsApprovedForAllParams["operator"],
  ) {
    return this.eth_call(functions.isApprovedForAll, { account, operator });
  }

  proxiableUUID() {
    return this.eth_call(functions.proxiableUUID, {});
  }

  supportsInterface(interfaceId: SupportsInterfaceParams["interfaceId"]) {
    return this.eth_call(functions.supportsInterface, { interfaceId });
  }

  uri(id: UriParams["id"]) {
    return this.eth_call(functions.uri, { id });
  }

  whitelists(_0: WhitelistsParams["_0"]) {
    return this.eth_call(functions.whitelists, { _0 });
  }
}

/// Event types
export type ApprovalForAllEventArgs = EParams<typeof events.ApprovalForAll>;
export type InitializedEventArgs = EParams<typeof events.Initialized>;
export type RoleAdminChangedEventArgs = EParams<typeof events.RoleAdminChanged>;
export type RoleGrantedEventArgs = EParams<typeof events.RoleGranted>;
export type RoleRevokedEventArgs = EParams<typeof events.RoleRevoked>;
export type TransferBatchEventArgs = EParams<typeof events.TransferBatch>;
export type TransferSingleEventArgs = EParams<typeof events.TransferSingle>;
export type URIEventArgs = EParams<typeof events.URI>;
export type UpgradedEventArgs = EParams<typeof events.Upgraded>;

/// Function types
export type DEFAULT_ADMIN_ROLEParams = FunctionArguments<
  typeof functions.DEFAULT_ADMIN_ROLE
>;
export type DEFAULT_ADMIN_ROLEReturn = FunctionReturn<
  typeof functions.DEFAULT_ADMIN_ROLE
>;

export type ERROR_ALREADY_WHITELISTEDParams = FunctionArguments<
  typeof functions.ERROR_ALREADY_WHITELISTED
>;
export type ERROR_ALREADY_WHITELISTEDReturn = FunctionReturn<
  typeof functions.ERROR_ALREADY_WHITELISTED
>;

export type ERROR_TO_ADDRESS_NOT_IN_WHITELISTParams = FunctionArguments<
  typeof functions.ERROR_TO_ADDRESS_NOT_IN_WHITELIST
>;
export type ERROR_TO_ADDRESS_NOT_IN_WHITELISTReturn = FunctionReturn<
  typeof functions.ERROR_TO_ADDRESS_NOT_IN_WHITELIST
>;

export type ERROR_WHITELIST_ALREADY_REMOVEDParams = FunctionArguments<
  typeof functions.ERROR_WHITELIST_ALREADY_REMOVED
>;
export type ERROR_WHITELIST_ALREADY_REMOVEDReturn = FunctionReturn<
  typeof functions.ERROR_WHITELIST_ALREADY_REMOVED
>;

export type ERROR_WHITELIST_NOT_INITIALIZEDParams = FunctionArguments<
  typeof functions.ERROR_WHITELIST_NOT_INITIALIZED
>;
export type ERROR_WHITELIST_NOT_INITIALIZEDReturn = FunctionReturn<
  typeof functions.ERROR_WHITELIST_NOT_INITIALIZED
>;

export type MANAGER_ROLEParams = FunctionArguments<
  typeof functions.MANAGER_ROLE
>;
export type MANAGER_ROLEReturn = FunctionReturn<typeof functions.MANAGER_ROLE>;

export type MINTER_ROLEParams = FunctionArguments<typeof functions.MINTER_ROLE>;
export type MINTER_ROLEReturn = FunctionReturn<typeof functions.MINTER_ROLE>;

export type TRANSFERER_ROLEParams = FunctionArguments<
  typeof functions.TRANSFERER_ROLE
>;
export type TRANSFERER_ROLEReturn = FunctionReturn<
  typeof functions.TRANSFERER_ROLE
>;

export type UPGRADE_INTERFACE_VERSIONParams = FunctionArguments<
  typeof functions.UPGRADE_INTERFACE_VERSION
>;
export type UPGRADE_INTERFACE_VERSIONReturn = FunctionReturn<
  typeof functions.UPGRADE_INTERFACE_VERSION
>;

export type AddWhitelistParams = FunctionArguments<
  typeof functions.addWhitelist
>;
export type AddWhitelistReturn = FunctionReturn<typeof functions.addWhitelist>;

export type BalanceOfParams = FunctionArguments<typeof functions.balanceOf>;
export type BalanceOfReturn = FunctionReturn<typeof functions.balanceOf>;

export type BalanceOfBatchParams = FunctionArguments<
  typeof functions.balanceOfBatch
>;
export type BalanceOfBatchReturn = FunctionReturn<
  typeof functions.balanceOfBatch
>;

export type BurnParams = FunctionArguments<typeof functions.burn>;
export type BurnReturn = FunctionReturn<typeof functions.burn>;

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

export type MintParams = FunctionArguments<typeof functions.mint>;
export type MintReturn = FunctionReturn<typeof functions.mint>;

export type MintBatchParams = FunctionArguments<typeof functions.mintBatch>;
export type MintBatchReturn = FunctionReturn<typeof functions.mintBatch>;

export type ProxiableUUIDParams = FunctionArguments<
  typeof functions.proxiableUUID
>;
export type ProxiableUUIDReturn = FunctionReturn<
  typeof functions.proxiableUUID
>;

export type RemoveWhitelistParams = FunctionArguments<
  typeof functions.removeWhitelist
>;
export type RemoveWhitelistReturn = FunctionReturn<
  typeof functions.removeWhitelist
>;

export type RenounceRoleParams = FunctionArguments<
  typeof functions.renounceRole
>;
export type RenounceRoleReturn = FunctionReturn<typeof functions.renounceRole>;

export type RevokeRoleParams = FunctionArguments<typeof functions.revokeRole>;
export type RevokeRoleReturn = FunctionReturn<typeof functions.revokeRole>;

export type SafeBatchTransferFromParams = FunctionArguments<
  typeof functions.safeBatchTransferFrom
>;
export type SafeBatchTransferFromReturn = FunctionReturn<
  typeof functions.safeBatchTransferFrom
>;

export type SafeTransferFromParams = FunctionArguments<
  typeof functions.safeTransferFrom
>;
export type SafeTransferFromReturn = FunctionReturn<
  typeof functions.safeTransferFrom
>;

export type SetApprovalForAllParams = FunctionArguments<
  typeof functions.setApprovalForAll
>;
export type SetApprovalForAllReturn = FunctionReturn<
  typeof functions.setApprovalForAll
>;

export type SetURIParams = FunctionArguments<typeof functions.setURI>;
export type SetURIReturn = FunctionReturn<typeof functions.setURI>;

export type SetWhitelistCheckParams = FunctionArguments<
  typeof functions.setWhitelistCheck
>;
export type SetWhitelistCheckReturn = FunctionReturn<
  typeof functions.setWhitelistCheck
>;

export type SupportsInterfaceParams = FunctionArguments<
  typeof functions.supportsInterface
>;
export type SupportsInterfaceReturn = FunctionReturn<
  typeof functions.supportsInterface
>;

export type UpgradeToAndCallParams = FunctionArguments<
  typeof functions.upgradeToAndCall
>;
export type UpgradeToAndCallReturn = FunctionReturn<
  typeof functions.upgradeToAndCall
>;

export type UriParams = FunctionArguments<typeof functions.uri>;
export type UriReturn = FunctionReturn<typeof functions.uri>;

export type WhitelistsParams = FunctionArguments<typeof functions.whitelists>;
export type WhitelistsReturn = FunctionReturn<typeof functions.whitelists>;
