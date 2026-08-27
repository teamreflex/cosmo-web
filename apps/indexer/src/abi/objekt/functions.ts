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

/** ERROR_BLACKLISTED_MSG_SENDER() */
export const ERROR_BLACKLISTED_MSG_SENDER = func("0x1111d78f", {}, string);
export type ERROR_BLACKLISTED_MSG_SENDERParams = FunctionArguments<
  typeof ERROR_BLACKLISTED_MSG_SENDER
>;
export type ERROR_BLACKLISTED_MSG_SENDERReturn = FunctionReturn<
  typeof ERROR_BLACKLISTED_MSG_SENDER
>;

/** ERROR_CANNOT_TRANSFER_EXTERNALLY() */
export const ERROR_CANNOT_TRANSFER_EXTERNALLY = func("0xf304e990", {}, string);
export type ERROR_CANNOT_TRANSFER_EXTERNALLYParams = FunctionArguments<
  typeof ERROR_CANNOT_TRANSFER_EXTERNALLY
>;
export type ERROR_CANNOT_TRANSFER_EXTERNALLYReturn = FunctionReturn<
  typeof ERROR_CANNOT_TRANSFER_EXTERNALLY
>;

/** ERROR_INVALID_TOKEN_ID_RANGE() */
export const ERROR_INVALID_TOKEN_ID_RANGE = func("0xeab6fab3", {}, string);
export type ERROR_INVALID_TOKEN_ID_RANGEParams = FunctionArguments<
  typeof ERROR_INVALID_TOKEN_ID_RANGE
>;
export type ERROR_INVALID_TOKEN_ID_RANGEReturn = FunctionReturn<
  typeof ERROR_INVALID_TOKEN_ID_RANGE
>;

/** ERROR_NON_TRANSFERABLE_OBJEKT() */
export const ERROR_NON_TRANSFERABLE_OBJEKT = func("0x8a2969c8", {}, string);
export type ERROR_NON_TRANSFERABLE_OBJEKTParams = FunctionArguments<
  typeof ERROR_NON_TRANSFERABLE_OBJEKT
>;
export type ERROR_NON_TRANSFERABLE_OBJEKTReturn = FunctionReturn<
  typeof ERROR_NON_TRANSFERABLE_OBJEKT
>;

/** ERROR_NOT_ADMIN() */
export const ERROR_NOT_ADMIN = func("0x944565e2", {}, string);
export type ERROR_NOT_ADMINParams = FunctionArguments<typeof ERROR_NOT_ADMIN>;
export type ERROR_NOT_ADMINReturn = FunctionReturn<typeof ERROR_NOT_ADMIN>;

/** ERROR_NOT_AUTHORIZED_APPROVAL() */
export const ERROR_NOT_AUTHORIZED_APPROVAL = func("0xd5a40857", {}, string);
export type ERROR_NOT_AUTHORIZED_APPROVALParams = FunctionArguments<
  typeof ERROR_NOT_AUTHORIZED_APPROVAL
>;
export type ERROR_NOT_AUTHORIZED_APPROVALReturn = FunctionReturn<
  typeof ERROR_NOT_AUTHORIZED_APPROVAL
>;

/** ERROR_NOT_MINTER() */
export const ERROR_NOT_MINTER = func("0x459c035e", {}, string);
export type ERROR_NOT_MINTERParams = FunctionArguments<typeof ERROR_NOT_MINTER>;
export type ERROR_NOT_MINTERReturn = FunctionReturn<typeof ERROR_NOT_MINTER>;

/** ERROR_ONLY_OWNER() */
export const ERROR_ONLY_OWNER = func("0x41f1162d", {}, string);
export type ERROR_ONLY_OWNERParams = FunctionArguments<typeof ERROR_ONLY_OWNER>;
export type ERROR_ONLY_OWNERReturn = FunctionReturn<typeof ERROR_ONLY_OWNER>;

/** ERROR_SENDER_NOT_ADMIN() */
export const ERROR_SENDER_NOT_ADMIN = func("0x1abd34e2", {}, string);
export type ERROR_SENDER_NOT_ADMINParams = FunctionArguments<
  typeof ERROR_SENDER_NOT_ADMIN
>;
export type ERROR_SENDER_NOT_ADMINReturn = FunctionReturn<
  typeof ERROR_SENDER_NOT_ADMIN
>;

/** MINTER_ROLE() */
export const MINTER_ROLE = func("0xd5391393", {}, bytes32);
export type MINTER_ROLEParams = FunctionArguments<typeof MINTER_ROLE>;
export type MINTER_ROLEReturn = FunctionReturn<typeof MINTER_ROLE>;

/** OPERATOR_ROLE() */
export const OPERATOR_ROLE = func("0xf5b541a6", {}, bytes32);
export type OPERATOR_ROLEParams = FunctionArguments<typeof OPERATOR_ROLE>;
export type OPERATOR_ROLEReturn = FunctionReturn<typeof OPERATOR_ROLE>;

/** UPGRADE_INTERFACE_VERSION() */
export const UPGRADE_INTERFACE_VERSION = func("0xad3cb1cc", {}, string);
export type UPGRADE_INTERFACE_VERSIONParams = FunctionArguments<
  typeof UPGRADE_INTERFACE_VERSION
>;
export type UPGRADE_INTERFACE_VERSIONReturn = FunctionReturn<
  typeof UPGRADE_INTERFACE_VERSION
>;

/** approvalWhitelists(address) */
export const approvalWhitelists = func(
  "0x419e583d",
  {
    _0: address,
  },
  bool,
);
export type ApprovalWhitelistsParams = FunctionArguments<
  typeof approvalWhitelists
>;
export type ApprovalWhitelistsReturn = FunctionReturn<
  typeof approvalWhitelists
>;

/** approve(address,uint256) */
export const approve = func("0x095ea7b3", {
  to: address,
  tokenId: uint256,
});
export type ApproveParams = FunctionArguments<typeof approve>;
export type ApproveReturn = FunctionReturn<typeof approve>;

/** balanceOf(address) */
export const balanceOf = func(
  "0x70a08231",
  {
    owner: address,
  },
  uint256,
);
export type BalanceOfParams = FunctionArguments<typeof balanceOf>;
export type BalanceOfReturn = FunctionReturn<typeof balanceOf>;

/** batchUpdateObjektTransferability(uint256[],bool) */
export const batchUpdateObjektTransferability = func("0xbf62c2e8", {
  tokenIds: array(uint256),
  transferable: bool,
});
export type BatchUpdateObjektTransferabilityParams = FunctionArguments<
  typeof batchUpdateObjektTransferability
>;
export type BatchUpdateObjektTransferabilityReturn = FunctionReturn<
  typeof batchUpdateObjektTransferability
>;

/** blacklists(address) */
export const blacklists = func(
  "0x16c02129",
  {
    _0: address,
  },
  bool,
);
export type BlacklistsParams = FunctionArguments<typeof blacklists>;
export type BlacklistsReturn = FunctionReturn<typeof blacklists>;

/** burn(uint256) */
export const burn = func("0x42966c68", {
  tokenId: uint256,
});
export type BurnParams = FunctionArguments<typeof burn>;
export type BurnReturn = FunctionReturn<typeof burn>;

/** getApproved(uint256) */
export const getApproved = func(
  "0x081812fc",
  {
    tokenId: uint256,
  },
  address,
);
export type GetApprovedParams = FunctionArguments<typeof getApproved>;
export type GetApprovedReturn = FunctionReturn<typeof getApproved>;

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
  baseURI_: string,
});
export type InitializeParams = FunctionArguments<typeof initialize>;
export type InitializeReturn = FunctionReturn<typeof initialize>;

/** isApprovedForAll(address,address) */
export const isApprovedForAll = func(
  "0xe985e9c5",
  {
    owner: address,
    operator: address,
  },
  bool,
);
export type IsApprovedForAllParams = FunctionArguments<typeof isApprovedForAll>;
export type IsApprovedForAllReturn = FunctionReturn<typeof isApprovedForAll>;

/** isObjektTransferable(uint256) */
export const isObjektTransferable = func(
  "0xb2c03a50",
  {
    _0: uint256,
  },
  bool,
);
export type IsObjektTransferableParams = FunctionArguments<
  typeof isObjektTransferable
>;
export type IsObjektTransferableReturn = FunctionReturn<
  typeof isObjektTransferable
>;

/** mint(address,uint256,bool) */
export const mint = func("0xd1a1beb4", {
  to: address,
  tokenId: uint256,
  transferable: bool,
});
export type MintParams = FunctionArguments<typeof mint>;
export type MintReturn = FunctionReturn<typeof mint>;

/** mintBatch(address,uint256,uint256,bool) */
export const mintBatch = func("0x71c87f29", {
  to: address,
  startTokenId: uint256,
  endTokenId: uint256,
  transferable: bool,
});
export type MintBatchParams = FunctionArguments<typeof mintBatch>;
export type MintBatchReturn = FunctionReturn<typeof mintBatch>;

/** name() */
export const name = func("0x06fdde03", {}, string);
export type NameParams = FunctionArguments<typeof name>;
export type NameReturn = FunctionReturn<typeof name>;

/** ownerOf(uint256) */
export const ownerOf = func(
  "0x6352211e",
  {
    tokenId: uint256,
  },
  address,
);
export type OwnerOfParams = FunctionArguments<typeof ownerOf>;
export type OwnerOfReturn = FunctionReturn<typeof ownerOf>;

/** proxiableUUID() */
export const proxiableUUID = func("0x52d1902d", {}, bytes32);
export type ProxiableUUIDParams = FunctionArguments<typeof proxiableUUID>;
export type ProxiableUUIDReturn = FunctionReturn<typeof proxiableUUID>;

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

/** safeTransferFrom(address,address,uint256) */
export const safeTransferFrom = func("0x42842e0e", {
  from: address,
  to: address,
  tokenId: uint256,
});
export type SafeTransferFromParams = FunctionArguments<typeof safeTransferFrom>;
export type SafeTransferFromReturn = FunctionReturn<typeof safeTransferFrom>;

/** safeTransferFrom(address,address,uint256,bytes) */
export const safeTransferFrom_1 = func("0xb88d4fde", {
  from: address,
  to: address,
  tokenId: uint256,
  data: bytes,
});
export type SafeTransferFromParams_1 = FunctionArguments<
  typeof safeTransferFrom_1
>;
export type SafeTransferFromReturn_1 = FunctionReturn<
  typeof safeTransferFrom_1
>;

/** setApprovalForAll(address,bool) */
export const setApprovalForAll = func("0xa22cb465", {
  operator: address,
  approved: bool,
});
export type SetApprovalForAllParams = FunctionArguments<
  typeof setApprovalForAll
>;
export type SetApprovalForAllReturn = FunctionReturn<typeof setApprovalForAll>;

/** setApprovalWhitelist(address,bool) */
export const setApprovalWhitelist = func("0xca0429e0", {
  addr: address,
  isWhitelisted: bool,
});
export type SetApprovalWhitelistParams = FunctionArguments<
  typeof setApprovalWhitelist
>;
export type SetApprovalWhitelistReturn = FunctionReturn<
  typeof setApprovalWhitelist
>;

/** setBaseURI(string) */
export const setBaseURI = func("0x55f804b3", {
  _newBaseURI: string,
});
export type SetBaseURIParams = FunctionArguments<typeof setBaseURI>;
export type SetBaseURIReturn = FunctionReturn<typeof setBaseURI>;

/** setBlacklist(address,bool) */
export const setBlacklist = func("0x153b0d1e", {
  addr: address,
  isBlacklisted: bool,
});
export type SetBlacklistParams = FunctionArguments<typeof setBlacklist>;
export type SetBlacklistReturn = FunctionReturn<typeof setBlacklist>;

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

/** symbol() */
export const symbol = func("0x95d89b41", {}, string);
export type SymbolParams = FunctionArguments<typeof symbol>;
export type SymbolReturn = FunctionReturn<typeof symbol>;

/** tokenByIndex(uint256) */
export const tokenByIndex = func(
  "0x4f6ccce7",
  {
    index: uint256,
  },
  uint256,
);
export type TokenByIndexParams = FunctionArguments<typeof tokenByIndex>;
export type TokenByIndexReturn = FunctionReturn<typeof tokenByIndex>;

/** tokenOfOwnerByIndex(address,uint256) */
export const tokenOfOwnerByIndex = func(
  "0x2f745c59",
  {
    owner: address,
    index: uint256,
  },
  uint256,
);
export type TokenOfOwnerByIndexParams = FunctionArguments<
  typeof tokenOfOwnerByIndex
>;
export type TokenOfOwnerByIndexReturn = FunctionReturn<
  typeof tokenOfOwnerByIndex
>;

/** tokenURI(uint256) */
export const tokenURI = func(
  "0xc87b56dd",
  {
    tokenId: uint256,
  },
  string,
);
export type TokenURIParams = FunctionArguments<typeof tokenURI>;
export type TokenURIReturn = FunctionReturn<typeof tokenURI>;

/** totalSupply() */
export const totalSupply = func("0x18160ddd", {}, uint256);
export type TotalSupplyParams = FunctionArguments<typeof totalSupply>;
export type TotalSupplyReturn = FunctionReturn<typeof totalSupply>;

/** transferFrom(address,address,uint256) */
export const transferFrom = func("0x23b872dd", {
  from: address,
  to: address,
  tokenId: uint256,
});
export type TransferFromParams = FunctionArguments<typeof transferFrom>;
export type TransferFromReturn = FunctionReturn<typeof transferFrom>;

/** upgradeToAndCall(address,bytes) */
export const upgradeToAndCall = func("0x4f1ef286", {
  newImplementation: address,
  data: bytes,
});
export type UpgradeToAndCallParams = FunctionArguments<typeof upgradeToAndCall>;
export type UpgradeToAndCallReturn = FunctionReturn<typeof upgradeToAndCall>;
