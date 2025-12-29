import { event, fun, viewFun, indexed, ContractBase } from "@subsquid/evm-abi";
import type {
  EventParams as EParams,
  FunctionArguments,
  FunctionReturn,
} from "@subsquid/evm-abi";
import * as p from "@subsquid/evm-codec";

export const events = {
  EIP712DomainChanged: event(
    "0x0a6387c9ea3628b88a633bb4f3b151770f70085117a15f9bf3787cda53f13d31",
    "EIP712DomainChanged()",
    {},
  ),
  Finalized: event(
    "0x069cb9cf3066619f9a83be465993a22843ea7baba731ac97ac208899985dc007",
    "Finalized(uint256,uint256,uint256)",
    {
      tokenId: indexed(p.uint256),
      pollId: indexed(p.uint256),
      burned: p.uint256,
    },
  ),
  Initialized: event(
    "0xc7f505b2f371ae2175ee4913f4499e1f2633a7b5936321eed1cdaeb6115181d2",
    "Initialized(uint64)",
    { version: p.uint64 },
  ),
  PollCreated: event(
    "0x79fb617314647013123901234cea859ab2df200423a4048a35d9cf59437a9b64",
    "PollCreated(uint256,uint256)",
    { tokenId: p.uint256, pollId: p.uint256 },
  ),
  Revealed: event(
    "0xa02957988806bd9d30dcd2845b047aa4f45bede519fbd15ebafe428505b0900f",
    "Revealed(uint256,uint256,uint256,uint256)",
    {
      tokenId: indexed(p.uint256),
      pollId: indexed(p.uint256),
      revealedVotes: p.uint256,
      remainingVotes: p.uint256,
    },
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
  Upgraded: event(
    "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b",
    "Upgraded(address)",
    { implementation: indexed(p.address) },
  ),
  Voted: event(
    "0x0f066129e5902e103e22209fff5d12a79f07dc9ef7c78fe10ff64c741a20c8ec",
    "Voted(uint256,uint256,address,uint256,bytes32)",
    {
      tokenId: indexed(p.uint256),
      pollId: indexed(p.uint256),
      voter: p.address,
      tokenAmount: p.uint256,
      hash: p.bytes32,
    },
  ),
};

export const functions = {
  DEFAULT_ADMIN_ROLE: viewFun(
    "0xa217fddf",
    "DEFAULT_ADMIN_ROLE()",
    {},
    p.bytes32,
  ),
  ERROR_ALL_VOTES_REVEALED: viewFun(
    "0x46d04869",
    "ERROR_ALL_VOTES_REVEALED()",
    {},
    p.string,
  ),
  ERROR_EMPTY_CALLDATA: viewFun(
    "0xfdaff161",
    "ERROR_EMPTY_CALLDATA()",
    {},
    p.string,
  ),
  ERROR_INSUFFICIENT_TOKEN_AMOUNT: viewFun(
    "0x61871ac4",
    "ERROR_INSUFFICIENT_TOKEN_AMOUNT()",
    {},
    p.string,
  ),
  ERROR_INVALID_CANDIDATES_LENGTH: viewFun(
    "0x31a869a5",
    "ERROR_INVALID_CANDIDATES_LENGTH()",
    {},
    p.string,
  ),
  ERROR_INVALID_DATA_LENGTH: viewFun(
    "0x5ee958b2",
    "ERROR_INVALID_DATA_LENGTH()",
    {},
    p.string,
  ),
  ERROR_INVALID_DUE: viewFun("0x074a485c", "ERROR_INVALID_DUE()", {}, p.string),
  ERROR_INVALID_FROM_ADDRESS: viewFun(
    "0xd807d5fd",
    "ERROR_INVALID_FROM_ADDRESS()",
    {},
    p.string,
  ),
  ERROR_INVALID_MINIMUM_TOKEN: viewFun(
    "0xf8f9a91a",
    "ERROR_INVALID_MINIMUM_TOKEN()",
    {},
    p.string,
  ),
  ERROR_INVALID_OFFSET: viewFun(
    "0xe8a39056",
    "ERROR_INVALID_OFFSET()",
    {},
    p.string,
  ),
  ERROR_INVALID_REVEAL_DATA: viewFun(
    "0x63d32a89",
    "ERROR_INVALID_REVEAL_DATA()",
    {},
    p.string,
  ),
  ERROR_INVALID_START_AT: viewFun(
    "0xf055304e",
    "ERROR_INVALID_START_AT()",
    {},
    p.string,
  ),
  ERROR_INVALID_TOKEN_UNIT: viewFun(
    "0xd66a493e",
    "ERROR_INVALID_TOKEN_UNIT()",
    {},
    p.string,
  ),
  ERROR_INVALID_VOTE_SIGNER_ADDRESS: viewFun(
    "0x23cc8ac8",
    "ERROR_INVALID_VOTE_SIGNER_ADDRESS()",
    {},
    p.string,
  ),
  ERROR_INVALID_VOTE_UNIT: viewFun(
    "0x7c69a472",
    "ERROR_INVALID_VOTE_UNIT()",
    {},
    p.string,
  ),
  ERROR_NOT_ALL_VOTES_REVEALED: viewFun(
    "0xb762c542",
    "ERROR_NOT_ALL_VOTES_REVEALED()",
    {},
    p.string,
  ),
  ERROR_NOT_IN_PROGRESS: viewFun(
    "0x22b207ff",
    "ERROR_NOT_IN_PROGRESS()",
    {},
    p.string,
  ),
  ERROR_POLL_ALREADY_EXISTS: viewFun(
    "0x7803e191",
    "ERROR_POLL_ALREADY_EXISTS()",
    {},
    p.string,
  ),
  ERROR_POLL_ALREADY_FINALIZED: viewFun(
    "0xdcf470c7",
    "ERROR_POLL_ALREADY_FINALIZED()",
    {},
    p.string,
  ),
  ERROR_POLL_NOT_EXISTS: viewFun(
    "0xcb219983",
    "ERROR_POLL_NOT_EXISTS()",
    {},
    p.string,
  ),
  ERROR_VOTE_HASH_CANNOT_BE_REPLAYED: viewFun(
    "0xe303a43e",
    "ERROR_VOTE_HASH_CANNOT_BE_REPLAYED()",
    {},
    p.string,
  ),
  ERROR_VOTE_SIGNER_INVALID_SIGNATURE: viewFun(
    "0x80bba5c2",
    "ERROR_VOTE_SIGNER_INVALID_SIGNATURE()",
    {},
    p.string,
  ),
  OPERATOR_ROLE: viewFun("0xf5b541a6", "OPERATOR_ROLE()", {}, p.bytes32),
  UPGRADE_INTERFACE_VERSION: viewFun(
    "0xad3cb1cc",
    "UPGRADE_INTERFACE_VERSION()",
    {},
    p.string,
  ),
  candidates: viewFun(
    "0x7de14242",
    "candidates(uint256,uint256)",
    { tokenId: p.uint256, pollId: p.uint256 },
    p.array(p.string),
  ),
  createPoll: fun(
    "0x9612e586",
    "createPoll(uint256,uint256,string,string[],uint256,uint256,uint256,uint256)",
    {
      tokenId_: p.uint256,
      pollId_: p.uint256,
      title_: p.string,
      candidates_: p.array(p.string),
      startAt_: p.uint256,
      due_: p.uint256,
      minimumToken_: p.uint256,
      voteUnit_: p.uint256,
    },
  ),
  eip712Domain: viewFun(
    "0x84b0196e",
    "eip712Domain()",
    {},
    {
      fields: p.bytes1,
      name: p.string,
      version: p.string,
      chainId: p.uint256,
      verifyingContract: p.address,
      salt: p.bytes32,
      extensions: p.array(p.uint256),
    },
  ),
  finalize: fun("0xb6013cef", "finalize(uint256,uint256)", {
    tokenId: p.uint256,
    pollId: p.uint256,
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
  initialize: fun("0x485cc955", "initialize(address,address)", {
    tokenAddress: p.address,
    voteSignerAddress: p.address,
  }),
  onERC1155BatchReceived: fun(
    "0xbc197c81",
    "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)",
    {
      operator: p.address,
      from: p.address,
      tokenIds: p.array(p.uint256),
      values: p.array(p.uint256),
      data: p.bytes,
    },
    p.bytes4,
  ),
  onERC1155Received: fun(
    "0xf23a6e61",
    "onERC1155Received(address,address,uint256,uint256,bytes)",
    {
      operator: p.address,
      from: p.address,
      tokenId: p.uint256,
      amount: p.uint256,
      data: p.bytes,
    },
    p.bytes4,
  ),
  proxiableUUID: viewFun("0x52d1902d", "proxiableUUID()", {}, p.bytes32),
  remainingVotesCount: viewFun(
    "0xe25afda5",
    "remainingVotesCount(uint256,uint256)",
    { tokenId: p.uint256, pollId: p.uint256 },
    p.uint256,
  ),
  renounceRole: fun("0x36568abe", "renounceRole(bytes32,address)", {
    role: p.bytes32,
    callerConfirmation: p.address,
  }),
  reveal: fun(
    "0x63cf5547",
    "reveal(uint256,uint256,(uint256,bytes32)[],uint256)",
    {
      tokenId: p.uint256,
      pollId: p.uint256,
      data: p.array(p.struct({ votedCandidateId: p.uint256, salt: p.bytes32 })),
      offset: p.uint256,
    },
  ),
  revokeRole: fun("0xd547741f", "revokeRole(bytes32,address)", {
    role: p.bytes32,
    account: p.address,
  }),
  setVoteSignerAddress: fun("0xf7729a2c", "setVoteSignerAddress(address)", {
    addr: p.address,
  }),
  supportsInterface: viewFun(
    "0x01ffc9a7",
    "supportsInterface(bytes4)",
    { interfaceId: p.bytes4 },
    p.bool,
  ),
  totalVotesCount: viewFun(
    "0xf65f9a7d",
    "totalVotesCount(uint256,uint256)",
    { tokenId: p.uint256, pollId: p.uint256 },
    p.uint256,
  ),
  upgradeToAndCall: fun("0x4f1ef286", "upgradeToAndCall(address,bytes)", {
    newImplementation: p.address,
    data: p.bytes,
  }),
  voteSignerAddress: viewFun(
    "0x525e70f6",
    "voteSignerAddress()",
    {},
    p.address,
  ),
  votesPerCandidates: viewFun(
    "0x28833187",
    "votesPerCandidates(uint256,uint256)",
    { tokenId: p.uint256, pollId: p.uint256 },
    p.array(p.uint256),
  ),
};

export class Contract extends ContractBase {
  DEFAULT_ADMIN_ROLE() {
    return this.eth_call(functions.DEFAULT_ADMIN_ROLE, {});
  }

  ERROR_ALL_VOTES_REVEALED() {
    return this.eth_call(functions.ERROR_ALL_VOTES_REVEALED, {});
  }

  ERROR_EMPTY_CALLDATA() {
    return this.eth_call(functions.ERROR_EMPTY_CALLDATA, {});
  }

  ERROR_INSUFFICIENT_TOKEN_AMOUNT() {
    return this.eth_call(functions.ERROR_INSUFFICIENT_TOKEN_AMOUNT, {});
  }

  ERROR_INVALID_CANDIDATES_LENGTH() {
    return this.eth_call(functions.ERROR_INVALID_CANDIDATES_LENGTH, {});
  }

  ERROR_INVALID_DATA_LENGTH() {
    return this.eth_call(functions.ERROR_INVALID_DATA_LENGTH, {});
  }

  ERROR_INVALID_DUE() {
    return this.eth_call(functions.ERROR_INVALID_DUE, {});
  }

  ERROR_INVALID_FROM_ADDRESS() {
    return this.eth_call(functions.ERROR_INVALID_FROM_ADDRESS, {});
  }

  ERROR_INVALID_MINIMUM_TOKEN() {
    return this.eth_call(functions.ERROR_INVALID_MINIMUM_TOKEN, {});
  }

  ERROR_INVALID_OFFSET() {
    return this.eth_call(functions.ERROR_INVALID_OFFSET, {});
  }

  ERROR_INVALID_REVEAL_DATA() {
    return this.eth_call(functions.ERROR_INVALID_REVEAL_DATA, {});
  }

  ERROR_INVALID_START_AT() {
    return this.eth_call(functions.ERROR_INVALID_START_AT, {});
  }

  ERROR_INVALID_TOKEN_UNIT() {
    return this.eth_call(functions.ERROR_INVALID_TOKEN_UNIT, {});
  }

  ERROR_INVALID_VOTE_SIGNER_ADDRESS() {
    return this.eth_call(functions.ERROR_INVALID_VOTE_SIGNER_ADDRESS, {});
  }

  ERROR_INVALID_VOTE_UNIT() {
    return this.eth_call(functions.ERROR_INVALID_VOTE_UNIT, {});
  }

  ERROR_NOT_ALL_VOTES_REVEALED() {
    return this.eth_call(functions.ERROR_NOT_ALL_VOTES_REVEALED, {});
  }

  ERROR_NOT_IN_PROGRESS() {
    return this.eth_call(functions.ERROR_NOT_IN_PROGRESS, {});
  }

  ERROR_POLL_ALREADY_EXISTS() {
    return this.eth_call(functions.ERROR_POLL_ALREADY_EXISTS, {});
  }

  ERROR_POLL_ALREADY_FINALIZED() {
    return this.eth_call(functions.ERROR_POLL_ALREADY_FINALIZED, {});
  }

  ERROR_POLL_NOT_EXISTS() {
    return this.eth_call(functions.ERROR_POLL_NOT_EXISTS, {});
  }

  ERROR_VOTE_HASH_CANNOT_BE_REPLAYED() {
    return this.eth_call(functions.ERROR_VOTE_HASH_CANNOT_BE_REPLAYED, {});
  }

  ERROR_VOTE_SIGNER_INVALID_SIGNATURE() {
    return this.eth_call(functions.ERROR_VOTE_SIGNER_INVALID_SIGNATURE, {});
  }

  OPERATOR_ROLE() {
    return this.eth_call(functions.OPERATOR_ROLE, {});
  }

  UPGRADE_INTERFACE_VERSION() {
    return this.eth_call(functions.UPGRADE_INTERFACE_VERSION, {});
  }

  candidates(
    tokenId: CandidatesParams["tokenId"],
    pollId: CandidatesParams["pollId"],
  ) {
    return this.eth_call(functions.candidates, { tokenId, pollId });
  }

  eip712Domain() {
    return this.eth_call(functions.eip712Domain, {});
  }

  getRoleAdmin(role: GetRoleAdminParams["role"]) {
    return this.eth_call(functions.getRoleAdmin, { role });
  }

  hasRole(role: HasRoleParams["role"], account: HasRoleParams["account"]) {
    return this.eth_call(functions.hasRole, { role, account });
  }

  proxiableUUID() {
    return this.eth_call(functions.proxiableUUID, {});
  }

  remainingVotesCount(
    tokenId: RemainingVotesCountParams["tokenId"],
    pollId: RemainingVotesCountParams["pollId"],
  ) {
    return this.eth_call(functions.remainingVotesCount, { tokenId, pollId });
  }

  supportsInterface(interfaceId: SupportsInterfaceParams["interfaceId"]) {
    return this.eth_call(functions.supportsInterface, { interfaceId });
  }

  totalVotesCount(
    tokenId: TotalVotesCountParams["tokenId"],
    pollId: TotalVotesCountParams["pollId"],
  ) {
    return this.eth_call(functions.totalVotesCount, { tokenId, pollId });
  }

  voteSignerAddress() {
    return this.eth_call(functions.voteSignerAddress, {});
  }

  votesPerCandidates(
    tokenId: VotesPerCandidatesParams["tokenId"],
    pollId: VotesPerCandidatesParams["pollId"],
  ) {
    return this.eth_call(functions.votesPerCandidates, { tokenId, pollId });
  }
}

/// Event types
export type EIP712DomainChangedEventArgs = EParams<
  typeof events.EIP712DomainChanged
>;
export type FinalizedEventArgs = EParams<typeof events.Finalized>;
export type InitializedEventArgs = EParams<typeof events.Initialized>;
export type PollCreatedEventArgs = EParams<typeof events.PollCreated>;
export type RevealedEventArgs = EParams<typeof events.Revealed>;
export type RoleAdminChangedEventArgs = EParams<typeof events.RoleAdminChanged>;
export type RoleGrantedEventArgs = EParams<typeof events.RoleGranted>;
export type RoleRevokedEventArgs = EParams<typeof events.RoleRevoked>;
export type UpgradedEventArgs = EParams<typeof events.Upgraded>;
export type VotedEventArgs = EParams<typeof events.Voted>;

/// Function types
export type DEFAULT_ADMIN_ROLEParams = FunctionArguments<
  typeof functions.DEFAULT_ADMIN_ROLE
>;
export type DEFAULT_ADMIN_ROLEReturn = FunctionReturn<
  typeof functions.DEFAULT_ADMIN_ROLE
>;

export type ERROR_ALL_VOTES_REVEALEDParams = FunctionArguments<
  typeof functions.ERROR_ALL_VOTES_REVEALED
>;
export type ERROR_ALL_VOTES_REVEALEDReturn = FunctionReturn<
  typeof functions.ERROR_ALL_VOTES_REVEALED
>;

export type ERROR_EMPTY_CALLDATAParams = FunctionArguments<
  typeof functions.ERROR_EMPTY_CALLDATA
>;
export type ERROR_EMPTY_CALLDATAReturn = FunctionReturn<
  typeof functions.ERROR_EMPTY_CALLDATA
>;

export type ERROR_INSUFFICIENT_TOKEN_AMOUNTParams = FunctionArguments<
  typeof functions.ERROR_INSUFFICIENT_TOKEN_AMOUNT
>;
export type ERROR_INSUFFICIENT_TOKEN_AMOUNTReturn = FunctionReturn<
  typeof functions.ERROR_INSUFFICIENT_TOKEN_AMOUNT
>;

export type ERROR_INVALID_CANDIDATES_LENGTHParams = FunctionArguments<
  typeof functions.ERROR_INVALID_CANDIDATES_LENGTH
>;
export type ERROR_INVALID_CANDIDATES_LENGTHReturn = FunctionReturn<
  typeof functions.ERROR_INVALID_CANDIDATES_LENGTH
>;

export type ERROR_INVALID_DATA_LENGTHParams = FunctionArguments<
  typeof functions.ERROR_INVALID_DATA_LENGTH
>;
export type ERROR_INVALID_DATA_LENGTHReturn = FunctionReturn<
  typeof functions.ERROR_INVALID_DATA_LENGTH
>;

export type ERROR_INVALID_DUEParams = FunctionArguments<
  typeof functions.ERROR_INVALID_DUE
>;
export type ERROR_INVALID_DUEReturn = FunctionReturn<
  typeof functions.ERROR_INVALID_DUE
>;

export type ERROR_INVALID_FROM_ADDRESSParams = FunctionArguments<
  typeof functions.ERROR_INVALID_FROM_ADDRESS
>;
export type ERROR_INVALID_FROM_ADDRESSReturn = FunctionReturn<
  typeof functions.ERROR_INVALID_FROM_ADDRESS
>;

export type ERROR_INVALID_MINIMUM_TOKENParams = FunctionArguments<
  typeof functions.ERROR_INVALID_MINIMUM_TOKEN
>;
export type ERROR_INVALID_MINIMUM_TOKENReturn = FunctionReturn<
  typeof functions.ERROR_INVALID_MINIMUM_TOKEN
>;

export type ERROR_INVALID_OFFSETParams = FunctionArguments<
  typeof functions.ERROR_INVALID_OFFSET
>;
export type ERROR_INVALID_OFFSETReturn = FunctionReturn<
  typeof functions.ERROR_INVALID_OFFSET
>;

export type ERROR_INVALID_REVEAL_DATAParams = FunctionArguments<
  typeof functions.ERROR_INVALID_REVEAL_DATA
>;
export type ERROR_INVALID_REVEAL_DATAReturn = FunctionReturn<
  typeof functions.ERROR_INVALID_REVEAL_DATA
>;

export type ERROR_INVALID_START_ATParams = FunctionArguments<
  typeof functions.ERROR_INVALID_START_AT
>;
export type ERROR_INVALID_START_ATReturn = FunctionReturn<
  typeof functions.ERROR_INVALID_START_AT
>;

export type ERROR_INVALID_TOKEN_UNITParams = FunctionArguments<
  typeof functions.ERROR_INVALID_TOKEN_UNIT
>;
export type ERROR_INVALID_TOKEN_UNITReturn = FunctionReturn<
  typeof functions.ERROR_INVALID_TOKEN_UNIT
>;

export type ERROR_INVALID_VOTE_SIGNER_ADDRESSParams = FunctionArguments<
  typeof functions.ERROR_INVALID_VOTE_SIGNER_ADDRESS
>;
export type ERROR_INVALID_VOTE_SIGNER_ADDRESSReturn = FunctionReturn<
  typeof functions.ERROR_INVALID_VOTE_SIGNER_ADDRESS
>;

export type ERROR_INVALID_VOTE_UNITParams = FunctionArguments<
  typeof functions.ERROR_INVALID_VOTE_UNIT
>;
export type ERROR_INVALID_VOTE_UNITReturn = FunctionReturn<
  typeof functions.ERROR_INVALID_VOTE_UNIT
>;

export type ERROR_NOT_ALL_VOTES_REVEALEDParams = FunctionArguments<
  typeof functions.ERROR_NOT_ALL_VOTES_REVEALED
>;
export type ERROR_NOT_ALL_VOTES_REVEALEDReturn = FunctionReturn<
  typeof functions.ERROR_NOT_ALL_VOTES_REVEALED
>;

export type ERROR_NOT_IN_PROGRESSParams = FunctionArguments<
  typeof functions.ERROR_NOT_IN_PROGRESS
>;
export type ERROR_NOT_IN_PROGRESSReturn = FunctionReturn<
  typeof functions.ERROR_NOT_IN_PROGRESS
>;

export type ERROR_POLL_ALREADY_EXISTSParams = FunctionArguments<
  typeof functions.ERROR_POLL_ALREADY_EXISTS
>;
export type ERROR_POLL_ALREADY_EXISTSReturn = FunctionReturn<
  typeof functions.ERROR_POLL_ALREADY_EXISTS
>;

export type ERROR_POLL_ALREADY_FINALIZEDParams = FunctionArguments<
  typeof functions.ERROR_POLL_ALREADY_FINALIZED
>;
export type ERROR_POLL_ALREADY_FINALIZEDReturn = FunctionReturn<
  typeof functions.ERROR_POLL_ALREADY_FINALIZED
>;

export type ERROR_POLL_NOT_EXISTSParams = FunctionArguments<
  typeof functions.ERROR_POLL_NOT_EXISTS
>;
export type ERROR_POLL_NOT_EXISTSReturn = FunctionReturn<
  typeof functions.ERROR_POLL_NOT_EXISTS
>;

export type ERROR_VOTE_HASH_CANNOT_BE_REPLAYEDParams = FunctionArguments<
  typeof functions.ERROR_VOTE_HASH_CANNOT_BE_REPLAYED
>;
export type ERROR_VOTE_HASH_CANNOT_BE_REPLAYEDReturn = FunctionReturn<
  typeof functions.ERROR_VOTE_HASH_CANNOT_BE_REPLAYED
>;

export type ERROR_VOTE_SIGNER_INVALID_SIGNATUREParams = FunctionArguments<
  typeof functions.ERROR_VOTE_SIGNER_INVALID_SIGNATURE
>;
export type ERROR_VOTE_SIGNER_INVALID_SIGNATUREReturn = FunctionReturn<
  typeof functions.ERROR_VOTE_SIGNER_INVALID_SIGNATURE
>;

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

export type CandidatesParams = FunctionArguments<typeof functions.candidates>;
export type CandidatesReturn = FunctionReturn<typeof functions.candidates>;

export type CreatePollParams = FunctionArguments<typeof functions.createPoll>;
export type CreatePollReturn = FunctionReturn<typeof functions.createPoll>;

export type Eip712DomainParams = FunctionArguments<
  typeof functions.eip712Domain
>;
export type Eip712DomainReturn = FunctionReturn<typeof functions.eip712Domain>;

export type FinalizeParams = FunctionArguments<typeof functions.finalize>;
export type FinalizeReturn = FunctionReturn<typeof functions.finalize>;

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

export type OnERC1155BatchReceivedParams = FunctionArguments<
  typeof functions.onERC1155BatchReceived
>;
export type OnERC1155BatchReceivedReturn = FunctionReturn<
  typeof functions.onERC1155BatchReceived
>;

export type OnERC1155ReceivedParams = FunctionArguments<
  typeof functions.onERC1155Received
>;
export type OnERC1155ReceivedReturn = FunctionReturn<
  typeof functions.onERC1155Received
>;

export type ProxiableUUIDParams = FunctionArguments<
  typeof functions.proxiableUUID
>;
export type ProxiableUUIDReturn = FunctionReturn<
  typeof functions.proxiableUUID
>;

export type RemainingVotesCountParams = FunctionArguments<
  typeof functions.remainingVotesCount
>;
export type RemainingVotesCountReturn = FunctionReturn<
  typeof functions.remainingVotesCount
>;

export type RenounceRoleParams = FunctionArguments<
  typeof functions.renounceRole
>;
export type RenounceRoleReturn = FunctionReturn<typeof functions.renounceRole>;

export type RevealParams = FunctionArguments<typeof functions.reveal>;
export type RevealReturn = FunctionReturn<typeof functions.reveal>;

export type RevokeRoleParams = FunctionArguments<typeof functions.revokeRole>;
export type RevokeRoleReturn = FunctionReturn<typeof functions.revokeRole>;

export type SetVoteSignerAddressParams = FunctionArguments<
  typeof functions.setVoteSignerAddress
>;
export type SetVoteSignerAddressReturn = FunctionReturn<
  typeof functions.setVoteSignerAddress
>;

export type SupportsInterfaceParams = FunctionArguments<
  typeof functions.supportsInterface
>;
export type SupportsInterfaceReturn = FunctionReturn<
  typeof functions.supportsInterface
>;

export type TotalVotesCountParams = FunctionArguments<
  typeof functions.totalVotesCount
>;
export type TotalVotesCountReturn = FunctionReturn<
  typeof functions.totalVotesCount
>;

export type UpgradeToAndCallParams = FunctionArguments<
  typeof functions.upgradeToAndCall
>;
export type UpgradeToAndCallReturn = FunctionReturn<
  typeof functions.upgradeToAndCall
>;

export type VoteSignerAddressParams = FunctionArguments<
  typeof functions.voteSignerAddress
>;
export type VoteSignerAddressReturn = FunctionReturn<
  typeof functions.voteSignerAddress
>;

export type VotesPerCandidatesParams = FunctionArguments<
  typeof functions.votesPerCandidates
>;
export type VotesPerCandidatesReturn = FunctionReturn<
  typeof functions.votesPerCandidates
>;
