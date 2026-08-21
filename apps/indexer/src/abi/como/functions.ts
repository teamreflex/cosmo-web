import {
  address,
  array,
  bool,
  bytes,
  bytes32,
  bytes4,
  string,
  uint256,
} from "@subsquid/evm-codec";
import { func } from "../abi.support.js";
import type { FunctionArguments, FunctionReturn } from "../abi.support.js";

/** DEFAULT_ADMIN_ROLE() */
export const DEFAULT_ADMIN_ROLE = func("0xa217fddf", {}, bytes32);
export type DEFAULT_ADMIN_ROLEParams = FunctionArguments<
  typeof DEFAULT_ADMIN_ROLE
>;
export type DEFAULT_ADMIN_ROLEReturn = FunctionReturn<
  typeof DEFAULT_ADMIN_ROLE
>;

/** ERROR_ALREADY_WHITELISTED() */
export const ERROR_ALREADY_WHITELISTED = func("0x4b691084", {}, string);
export type ERROR_ALREADY_WHITELISTEDParams = FunctionArguments<
  typeof ERROR_ALREADY_WHITELISTED
>;
export type ERROR_ALREADY_WHITELISTEDReturn = FunctionReturn<
  typeof ERROR_ALREADY_WHITELISTED
>;

/** ERROR_TO_ADDRESS_NOT_IN_WHITELIST() */
export const ERROR_TO_ADDRESS_NOT_IN_WHITELIST = func("0xc120e7ca", {}, string);
export type ERROR_TO_ADDRESS_NOT_IN_WHITELISTParams = FunctionArguments<
  typeof ERROR_TO_ADDRESS_NOT_IN_WHITELIST
>;
export type ERROR_TO_ADDRESS_NOT_IN_WHITELISTReturn = FunctionReturn<
  typeof ERROR_TO_ADDRESS_NOT_IN_WHITELIST
>;

/** ERROR_WHITELIST_ALREADY_REMOVED() */
export const ERROR_WHITELIST_ALREADY_REMOVED = func("0xa5813f57", {}, string);
export type ERROR_WHITELIST_ALREADY_REMOVEDParams = FunctionArguments<
  typeof ERROR_WHITELIST_ALREADY_REMOVED
>;
export type ERROR_WHITELIST_ALREADY_REMOVEDReturn = FunctionReturn<
  typeof ERROR_WHITELIST_ALREADY_REMOVED
>;

/** ERROR_WHITELIST_NOT_INITIALIZED() */
export const ERROR_WHITELIST_NOT_INITIALIZED = func("0xf1af1e75", {}, string);
export type ERROR_WHITELIST_NOT_INITIALIZEDParams = FunctionArguments<
  typeof ERROR_WHITELIST_NOT_INITIALIZED
>;
export type ERROR_WHITELIST_NOT_INITIALIZEDReturn = FunctionReturn<
  typeof ERROR_WHITELIST_NOT_INITIALIZED
>;

/** MANAGER_ROLE() */
export const MANAGER_ROLE = func("0xec87621c", {}, bytes32);
export type MANAGER_ROLEParams = FunctionArguments<typeof MANAGER_ROLE>;
export type MANAGER_ROLEReturn = FunctionReturn<typeof MANAGER_ROLE>;

/** MINTER_ROLE() */
export const MINTER_ROLE = func("0xd5391393", {}, bytes32);
export type MINTER_ROLEParams = FunctionArguments<typeof MINTER_ROLE>;
export type MINTER_ROLEReturn = FunctionReturn<typeof MINTER_ROLE>;

/** TRANSFERER_ROLE() */
export const TRANSFERER_ROLE = func("0x0ade7dc1", {}, bytes32);
export type TRANSFERER_ROLEParams = FunctionArguments<typeof TRANSFERER_ROLE>;
export type TRANSFERER_ROLEReturn = FunctionReturn<typeof TRANSFERER_ROLE>;

/** UPGRADE_INTERFACE_VERSION() */
export const UPGRADE_INTERFACE_VERSION = func("0xad3cb1cc", {}, string);
export type UPGRADE_INTERFACE_VERSIONParams = FunctionArguments<
  typeof UPGRADE_INTERFACE_VERSION
>;
export type UPGRADE_INTERFACE_VERSIONReturn = FunctionReturn<
  typeof UPGRADE_INTERFACE_VERSION
>;

/** addWhitelist(uint256,address) */
export const addWhitelist = func("0x3e0b892a", {
  id: uint256,
  addr: address,
});
export type AddWhitelistParams = FunctionArguments<typeof addWhitelist>;
export type AddWhitelistReturn = FunctionReturn<typeof addWhitelist>;

/** balanceOf(address,uint256) */
export const balanceOf = func(
  "0x00fdd58e",
  {
    account: address,
    id: uint256,
  },
  uint256,
);
export type BalanceOfParams = FunctionArguments<typeof balanceOf>;
export type BalanceOfReturn = FunctionReturn<typeof balanceOf>;

/** balanceOfBatch(address[],uint256[]) */
export const balanceOfBatch = func(
  "0x4e1273f4",
  {
    accounts: array(address),
    ids: array(uint256),
  },
  array(uint256),
);
export type BalanceOfBatchParams = FunctionArguments<typeof balanceOfBatch>;
export type BalanceOfBatchReturn = FunctionReturn<typeof balanceOfBatch>;

/** burn(address,uint256,uint256) */
export const burn = func("0xf5298aca", {
  account: address,
  id: uint256,
  value: uint256,
});
export type BurnParams = FunctionArguments<typeof burn>;
export type BurnReturn = FunctionReturn<typeof burn>;

/** getRoleAdmin(bytes32) */
export const getRoleAdmin = func(
  "0x248a9ca3",
  {
    role: bytes32,
  },
  bytes32,
);
export type GetRoleAdminParams = FunctionArguments<typeof getRoleAdmin>;
export type GetRoleAdminReturn = FunctionReturn<typeof getRoleAdmin>;

/** grantRole(bytes32,address) */
export const grantRole = func("0x2f2ff15d", {
  role: bytes32,
  account: address,
});
export type GrantRoleParams = FunctionArguments<typeof grantRole>;
export type GrantRoleReturn = FunctionReturn<typeof grantRole>;

/** hasRole(bytes32,address) */
export const hasRole = func(
  "0x91d14854",
  {
    role: bytes32,
    account: address,
  },
  bool,
);
export type HasRoleParams = FunctionArguments<typeof hasRole>;
export type HasRoleReturn = FunctionReturn<typeof hasRole>;

/** initialize(string) */
export const initialize = func("0xf62d1888", {
  uri: string,
});
export type InitializeParams = FunctionArguments<typeof initialize>;
export type InitializeReturn = FunctionReturn<typeof initialize>;

/** isApprovedForAll(address,address) */
export const isApprovedForAll = func(
  "0xe985e9c5",
  {
    account: address,
    operator: address,
  },
  bool,
);
export type IsApprovedForAllParams = FunctionArguments<typeof isApprovedForAll>;
export type IsApprovedForAllReturn = FunctionReturn<typeof isApprovedForAll>;

/** mint(address,uint256,uint256,bytes) */
export const mint = func("0x731133e9", {
  to: address,
  id: uint256,
  amount: uint256,
  data: bytes,
});
export type MintParams = FunctionArguments<typeof mint>;
export type MintReturn = FunctionReturn<typeof mint>;

/** mintBatch(address,uint256[],uint256[],bytes) */
export const mintBatch = func("0x1f7fdffa", {
  to: address,
  ids: array(uint256),
  amounts: array(uint256),
  data: bytes,
});
export type MintBatchParams = FunctionArguments<typeof mintBatch>;
export type MintBatchReturn = FunctionReturn<typeof mintBatch>;

/** proxiableUUID() */
export const proxiableUUID = func("0x52d1902d", {}, bytes32);
export type ProxiableUUIDParams = FunctionArguments<typeof proxiableUUID>;
export type ProxiableUUIDReturn = FunctionReturn<typeof proxiableUUID>;

/** removeWhitelist(uint256,address) */
export const removeWhitelist = func("0x94008a6e", {
  id: uint256,
  addr: address,
});
export type RemoveWhitelistParams = FunctionArguments<typeof removeWhitelist>;
export type RemoveWhitelistReturn = FunctionReturn<typeof removeWhitelist>;

/** renounceRole(bytes32,address) */
export const renounceRole = func("0x36568abe", {
  role: bytes32,
  callerConfirmation: address,
});
export type RenounceRoleParams = FunctionArguments<typeof renounceRole>;
export type RenounceRoleReturn = FunctionReturn<typeof renounceRole>;

/** revokeRole(bytes32,address) */
export const revokeRole = func("0xd547741f", {
  role: bytes32,
  account: address,
});
export type RevokeRoleParams = FunctionArguments<typeof revokeRole>;
export type RevokeRoleReturn = FunctionReturn<typeof revokeRole>;

/** safeBatchTransferFrom(address,address,uint256[],uint256[],bytes) */
export const safeBatchTransferFrom = func("0x2eb2c2d6", {
  from: address,
  to: address,
  ids: array(uint256),
  values: array(uint256),
  data: bytes,
});
export type SafeBatchTransferFromParams = FunctionArguments<
  typeof safeBatchTransferFrom
>;
export type SafeBatchTransferFromReturn = FunctionReturn<
  typeof safeBatchTransferFrom
>;

/** safeTransferFrom(address,address,uint256,uint256,bytes) */
export const safeTransferFrom = func("0xf242432a", {
  from: address,
  to: address,
  id: uint256,
  value: uint256,
  data: bytes,
});
export type SafeTransferFromParams = FunctionArguments<typeof safeTransferFrom>;
export type SafeTransferFromReturn = FunctionReturn<typeof safeTransferFrom>;

/** setApprovalForAll(address,bool) */
export const setApprovalForAll = func("0xa22cb465", {
  operator: address,
  approved: bool,
});
export type SetApprovalForAllParams = FunctionArguments<
  typeof setApprovalForAll
>;
export type SetApprovalForAllReturn = FunctionReturn<typeof setApprovalForAll>;

/** setURI(string) */
export const setURI = func("0x02fe5305", {
  uri: string,
});
export type SetURIParams = FunctionArguments<typeof setURI>;
export type SetURIReturn = FunctionReturn<typeof setURI>;

/** setWhitelistCheck(uint256,bool) */
export const setWhitelistCheck = func("0xfcbb42ef", {
  id: uint256,
  isWhitelistCheckEnabled: bool,
});
export type SetWhitelistCheckParams = FunctionArguments<
  typeof setWhitelistCheck
>;
export type SetWhitelistCheckReturn = FunctionReturn<typeof setWhitelistCheck>;

/** supportsInterface(bytes4) */
export const supportsInterface = func(
  "0x01ffc9a7",
  {
    interfaceId: bytes4,
  },
  bool,
);
export type SupportsInterfaceParams = FunctionArguments<
  typeof supportsInterface
>;
export type SupportsInterfaceReturn = FunctionReturn<typeof supportsInterface>;

/** upgradeToAndCall(address,bytes) */
export const upgradeToAndCall = func("0x4f1ef286", {
  newImplementation: address,
  data: bytes,
});
export type UpgradeToAndCallParams = FunctionArguments<typeof upgradeToAndCall>;
export type UpgradeToAndCallReturn = FunctionReturn<typeof upgradeToAndCall>;

/** uri(uint256) */
export const uri = func(
  "0x0e89341c",
  {
    id: uint256,
  },
  string,
);
export type UriParams = FunctionArguments<typeof uri>;
export type UriReturn = FunctionReturn<typeof uri>;

/** whitelists(uint256) */
export const whitelists = func(
  "0xfe4d5add",
  {
    _0: uint256,
  },
  bool,
);
export type WhitelistsParams = FunctionArguments<typeof whitelists>;
export type WhitelistsReturn = FunctionReturn<typeof whitelists>;
