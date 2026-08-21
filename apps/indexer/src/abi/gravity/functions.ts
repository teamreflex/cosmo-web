import {
  address,
  array,
  bool,
  bytes,
  bytes1,
  bytes32,
  bytes4,
  string,
  struct,
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

/** ERROR_ALL_VOTES_REVEALED() */
export const ERROR_ALL_VOTES_REVEALED = func("0x46d04869", {}, string);
export type ERROR_ALL_VOTES_REVEALEDParams = FunctionArguments<
  typeof ERROR_ALL_VOTES_REVEALED
>;
export type ERROR_ALL_VOTES_REVEALEDReturn = FunctionReturn<
  typeof ERROR_ALL_VOTES_REVEALED
>;

/** ERROR_EMPTY_CALLDATA() */
export const ERROR_EMPTY_CALLDATA = func("0xfdaff161", {}, string);
export type ERROR_EMPTY_CALLDATAParams = FunctionArguments<
  typeof ERROR_EMPTY_CALLDATA
>;
export type ERROR_EMPTY_CALLDATAReturn = FunctionReturn<
  typeof ERROR_EMPTY_CALLDATA
>;

/** ERROR_INSUFFICIENT_TOKEN_AMOUNT() */
export const ERROR_INSUFFICIENT_TOKEN_AMOUNT = func("0x61871ac4", {}, string);
export type ERROR_INSUFFICIENT_TOKEN_AMOUNTParams = FunctionArguments<
  typeof ERROR_INSUFFICIENT_TOKEN_AMOUNT
>;
export type ERROR_INSUFFICIENT_TOKEN_AMOUNTReturn = FunctionReturn<
  typeof ERROR_INSUFFICIENT_TOKEN_AMOUNT
>;

/** ERROR_INVALID_CANDIDATES_LENGTH() */
export const ERROR_INVALID_CANDIDATES_LENGTH = func("0x31a869a5", {}, string);
export type ERROR_INVALID_CANDIDATES_LENGTHParams = FunctionArguments<
  typeof ERROR_INVALID_CANDIDATES_LENGTH
>;
export type ERROR_INVALID_CANDIDATES_LENGTHReturn = FunctionReturn<
  typeof ERROR_INVALID_CANDIDATES_LENGTH
>;

/** ERROR_INVALID_DATA_LENGTH() */
export const ERROR_INVALID_DATA_LENGTH = func("0x5ee958b2", {}, string);
export type ERROR_INVALID_DATA_LENGTHParams = FunctionArguments<
  typeof ERROR_INVALID_DATA_LENGTH
>;
export type ERROR_INVALID_DATA_LENGTHReturn = FunctionReturn<
  typeof ERROR_INVALID_DATA_LENGTH
>;

/** ERROR_INVALID_DUE() */
export const ERROR_INVALID_DUE = func("0x074a485c", {}, string);
export type ERROR_INVALID_DUEParams = FunctionArguments<
  typeof ERROR_INVALID_DUE
>;
export type ERROR_INVALID_DUEReturn = FunctionReturn<typeof ERROR_INVALID_DUE>;

/** ERROR_INVALID_FROM_ADDRESS() */
export const ERROR_INVALID_FROM_ADDRESS = func("0xd807d5fd", {}, string);
export type ERROR_INVALID_FROM_ADDRESSParams = FunctionArguments<
  typeof ERROR_INVALID_FROM_ADDRESS
>;
export type ERROR_INVALID_FROM_ADDRESSReturn = FunctionReturn<
  typeof ERROR_INVALID_FROM_ADDRESS
>;

/** ERROR_INVALID_MINIMUM_TOKEN() */
export const ERROR_INVALID_MINIMUM_TOKEN = func("0xf8f9a91a", {}, string);
export type ERROR_INVALID_MINIMUM_TOKENParams = FunctionArguments<
  typeof ERROR_INVALID_MINIMUM_TOKEN
>;
export type ERROR_INVALID_MINIMUM_TOKENReturn = FunctionReturn<
  typeof ERROR_INVALID_MINIMUM_TOKEN
>;

/** ERROR_INVALID_OFFSET() */
export const ERROR_INVALID_OFFSET = func("0xe8a39056", {}, string);
export type ERROR_INVALID_OFFSETParams = FunctionArguments<
  typeof ERROR_INVALID_OFFSET
>;
export type ERROR_INVALID_OFFSETReturn = FunctionReturn<
  typeof ERROR_INVALID_OFFSET
>;

/** ERROR_INVALID_REVEAL_DATA() */
export const ERROR_INVALID_REVEAL_DATA = func("0x63d32a89", {}, string);
export type ERROR_INVALID_REVEAL_DATAParams = FunctionArguments<
  typeof ERROR_INVALID_REVEAL_DATA
>;
export type ERROR_INVALID_REVEAL_DATAReturn = FunctionReturn<
  typeof ERROR_INVALID_REVEAL_DATA
>;

/** ERROR_INVALID_START_AT() */
export const ERROR_INVALID_START_AT = func("0xf055304e", {}, string);
export type ERROR_INVALID_START_ATParams = FunctionArguments<
  typeof ERROR_INVALID_START_AT
>;
export type ERROR_INVALID_START_ATReturn = FunctionReturn<
  typeof ERROR_INVALID_START_AT
>;

/** ERROR_INVALID_TOKEN_UNIT() */
export const ERROR_INVALID_TOKEN_UNIT = func("0xd66a493e", {}, string);
export type ERROR_INVALID_TOKEN_UNITParams = FunctionArguments<
  typeof ERROR_INVALID_TOKEN_UNIT
>;
export type ERROR_INVALID_TOKEN_UNITReturn = FunctionReturn<
  typeof ERROR_INVALID_TOKEN_UNIT
>;

/** ERROR_INVALID_VOTE_SIGNER_ADDRESS() */
export const ERROR_INVALID_VOTE_SIGNER_ADDRESS = func("0x23cc8ac8", {}, string);
export type ERROR_INVALID_VOTE_SIGNER_ADDRESSParams = FunctionArguments<
  typeof ERROR_INVALID_VOTE_SIGNER_ADDRESS
>;
export type ERROR_INVALID_VOTE_SIGNER_ADDRESSReturn = FunctionReturn<
  typeof ERROR_INVALID_VOTE_SIGNER_ADDRESS
>;

/** ERROR_INVALID_VOTE_UNIT() */
export const ERROR_INVALID_VOTE_UNIT = func("0x7c69a472", {}, string);
export type ERROR_INVALID_VOTE_UNITParams = FunctionArguments<
  typeof ERROR_INVALID_VOTE_UNIT
>;
export type ERROR_INVALID_VOTE_UNITReturn = FunctionReturn<
  typeof ERROR_INVALID_VOTE_UNIT
>;

/** ERROR_NOT_ALL_VOTES_REVEALED() */
export const ERROR_NOT_ALL_VOTES_REVEALED = func("0xb762c542", {}, string);
export type ERROR_NOT_ALL_VOTES_REVEALEDParams = FunctionArguments<
  typeof ERROR_NOT_ALL_VOTES_REVEALED
>;
export type ERROR_NOT_ALL_VOTES_REVEALEDReturn = FunctionReturn<
  typeof ERROR_NOT_ALL_VOTES_REVEALED
>;

/** ERROR_NOT_IN_PROGRESS() */
export const ERROR_NOT_IN_PROGRESS = func("0x22b207ff", {}, string);
export type ERROR_NOT_IN_PROGRESSParams = FunctionArguments<
  typeof ERROR_NOT_IN_PROGRESS
>;
export type ERROR_NOT_IN_PROGRESSReturn = FunctionReturn<
  typeof ERROR_NOT_IN_PROGRESS
>;

/** ERROR_POLL_ALREADY_EXISTS() */
export const ERROR_POLL_ALREADY_EXISTS = func("0x7803e191", {}, string);
export type ERROR_POLL_ALREADY_EXISTSParams = FunctionArguments<
  typeof ERROR_POLL_ALREADY_EXISTS
>;
export type ERROR_POLL_ALREADY_EXISTSReturn = FunctionReturn<
  typeof ERROR_POLL_ALREADY_EXISTS
>;

/** ERROR_POLL_ALREADY_FINALIZED() */
export const ERROR_POLL_ALREADY_FINALIZED = func("0xdcf470c7", {}, string);
export type ERROR_POLL_ALREADY_FINALIZEDParams = FunctionArguments<
  typeof ERROR_POLL_ALREADY_FINALIZED
>;
export type ERROR_POLL_ALREADY_FINALIZEDReturn = FunctionReturn<
  typeof ERROR_POLL_ALREADY_FINALIZED
>;

/** ERROR_POLL_NOT_EXISTS() */
export const ERROR_POLL_NOT_EXISTS = func("0xcb219983", {}, string);
export type ERROR_POLL_NOT_EXISTSParams = FunctionArguments<
  typeof ERROR_POLL_NOT_EXISTS
>;
export type ERROR_POLL_NOT_EXISTSReturn = FunctionReturn<
  typeof ERROR_POLL_NOT_EXISTS
>;

/** ERROR_VOTE_HASH_CANNOT_BE_REPLAYED() */
export const ERROR_VOTE_HASH_CANNOT_BE_REPLAYED = func(
  "0xe303a43e",
  {},
  string,
);
export type ERROR_VOTE_HASH_CANNOT_BE_REPLAYEDParams = FunctionArguments<
  typeof ERROR_VOTE_HASH_CANNOT_BE_REPLAYED
>;
export type ERROR_VOTE_HASH_CANNOT_BE_REPLAYEDReturn = FunctionReturn<
  typeof ERROR_VOTE_HASH_CANNOT_BE_REPLAYED
>;

/** ERROR_VOTE_SIGNER_INVALID_SIGNATURE() */
export const ERROR_VOTE_SIGNER_INVALID_SIGNATURE = func(
  "0x80bba5c2",
  {},
  string,
);
export type ERROR_VOTE_SIGNER_INVALID_SIGNATUREParams = FunctionArguments<
  typeof ERROR_VOTE_SIGNER_INVALID_SIGNATURE
>;
export type ERROR_VOTE_SIGNER_INVALID_SIGNATUREReturn = FunctionReturn<
  typeof ERROR_VOTE_SIGNER_INVALID_SIGNATURE
>;

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

/** candidates(uint256,uint256) */
export const candidates = func(
  "0x7de14242",
  {
    tokenId: uint256,
    pollId: uint256,
  },
  array(string),
);
export type CandidatesParams = FunctionArguments<typeof candidates>;
export type CandidatesReturn = FunctionReturn<typeof candidates>;

/** createPoll(uint256,uint256,string,string[],uint256,uint256,uint256,uint256) */
export const createPoll = func("0x9612e586", {
  tokenId_: uint256,
  pollId_: uint256,
  title_: string,
  candidates_: array(string),
  startAt_: uint256,
  due_: uint256,
  minimumToken_: uint256,
  voteUnit_: uint256,
});
export type CreatePollParams = FunctionArguments<typeof createPoll>;
export type CreatePollReturn = FunctionReturn<typeof createPoll>;

/** eip712Domain() */
export const eip712Domain = func(
  "0x84b0196e",
  {},
  struct({
    fields: bytes1,
    name: string,
    version: string,
    chainId: uint256,
    verifyingContract: address,
    salt: bytes32,
    extensions: array(uint256),
  }),
);
export type Eip712DomainParams = FunctionArguments<typeof eip712Domain>;
export type Eip712DomainReturn = FunctionReturn<typeof eip712Domain>;

/** finalize(uint256,uint256) */
export const finalize = func("0xb6013cef", {
  tokenId: uint256,
  pollId: uint256,
});
export type FinalizeParams = FunctionArguments<typeof finalize>;
export type FinalizeReturn = FunctionReturn<typeof finalize>;

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

/** initialize(address,address) */
export const initialize = func("0x485cc955", {
  tokenAddress: address,
  voteSignerAddress: address,
});
export type InitializeParams = FunctionArguments<typeof initialize>;
export type InitializeReturn = FunctionReturn<typeof initialize>;

/** onERC1155BatchReceived(address,address,uint256[],uint256[],bytes) */
export const onERC1155BatchReceived = func(
  "0xbc197c81",
  {
    operator: address,
    from: address,
    tokenIds: array(uint256),
    values: array(uint256),
    data: bytes,
  },
  bytes4,
);
export type OnERC1155BatchReceivedParams = FunctionArguments<
  typeof onERC1155BatchReceived
>;
export type OnERC1155BatchReceivedReturn = FunctionReturn<
  typeof onERC1155BatchReceived
>;

/** onERC1155Received(address,address,uint256,uint256,bytes) */
export const onERC1155Received = func(
  "0xf23a6e61",
  {
    operator: address,
    from: address,
    tokenId: uint256,
    amount: uint256,
    data: bytes,
  },
  bytes4,
);
export type OnERC1155ReceivedParams = FunctionArguments<
  typeof onERC1155Received
>;
export type OnERC1155ReceivedReturn = FunctionReturn<typeof onERC1155Received>;

/** proxiableUUID() */
export const proxiableUUID = func("0x52d1902d", {}, bytes32);
export type ProxiableUUIDParams = FunctionArguments<typeof proxiableUUID>;
export type ProxiableUUIDReturn = FunctionReturn<typeof proxiableUUID>;

/** remainingVotesCount(uint256,uint256) */
export const remainingVotesCount = func(
  "0xe25afda5",
  {
    tokenId: uint256,
    pollId: uint256,
  },
  uint256,
);
export type RemainingVotesCountParams = FunctionArguments<
  typeof remainingVotesCount
>;
export type RemainingVotesCountReturn = FunctionReturn<
  typeof remainingVotesCount
>;

/** renounceRole(bytes32,address) */
export const renounceRole = func("0x36568abe", {
  role: bytes32,
  callerConfirmation: address,
});
export type RenounceRoleParams = FunctionArguments<typeof renounceRole>;
export type RenounceRoleReturn = FunctionReturn<typeof renounceRole>;

/** reveal(uint256,uint256,(uint256,bytes32)[],uint256) */
export const reveal = func("0x63cf5547", {
  tokenId: uint256,
  pollId: uint256,
  data: array(
    struct({
      votedCandidateId: uint256,
      salt: bytes32,
    }),
  ),
  offset: uint256,
});
export type RevealParams = FunctionArguments<typeof reveal>;
export type RevealReturn = FunctionReturn<typeof reveal>;

/** revokeRole(bytes32,address) */
export const revokeRole = func("0xd547741f", {
  role: bytes32,
  account: address,
});
export type RevokeRoleParams = FunctionArguments<typeof revokeRole>;
export type RevokeRoleReturn = FunctionReturn<typeof revokeRole>;

/** setVoteSignerAddress(address) */
export const setVoteSignerAddress = func("0xf7729a2c", {
  addr: address,
});
export type SetVoteSignerAddressParams = FunctionArguments<
  typeof setVoteSignerAddress
>;
export type SetVoteSignerAddressReturn = FunctionReturn<
  typeof setVoteSignerAddress
>;

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

/** totalVotesCount(uint256,uint256) */
export const totalVotesCount = func(
  "0xf65f9a7d",
  {
    tokenId: uint256,
    pollId: uint256,
  },
  uint256,
);
export type TotalVotesCountParams = FunctionArguments<typeof totalVotesCount>;
export type TotalVotesCountReturn = FunctionReturn<typeof totalVotesCount>;

/** upgradeToAndCall(address,bytes) */
export const upgradeToAndCall = func("0x4f1ef286", {
  newImplementation: address,
  data: bytes,
});
export type UpgradeToAndCallParams = FunctionArguments<typeof upgradeToAndCall>;
export type UpgradeToAndCallReturn = FunctionReturn<typeof upgradeToAndCall>;

/** voteSignerAddress() */
export const voteSignerAddress = func("0x525e70f6", {}, address);
export type VoteSignerAddressParams = FunctionArguments<
  typeof voteSignerAddress
>;
export type VoteSignerAddressReturn = FunctionReturn<typeof voteSignerAddress>;

/** votesPerCandidates(uint256,uint256) */
export const votesPerCandidates = func(
  "0x28833187",
  {
    tokenId: uint256,
    pollId: uint256,
  },
  array(uint256),
);
export type VotesPerCandidatesParams = FunctionArguments<
  typeof votesPerCandidates
>;
export type VotesPerCandidatesReturn = FunctionReturn<
  typeof votesPerCandidates
>;
