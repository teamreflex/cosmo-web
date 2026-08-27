import { address, bytes32, uint256, uint64 } from "@subsquid/evm-codec";
import { event, indexed } from "../abi.support.js";
import type { EventParams as EParams } from "../abi.support.js";

/** EIP712DomainChanged() */
export const EIP712DomainChanged = event(
  "0x0a6387c9ea3628b88a633bb4f3b151770f70085117a15f9bf3787cda53f13d31",
  {},
);
export type EIP712DomainChangedEventArgs = EParams<typeof EIP712DomainChanged>;

/** Finalized(uint256,uint256,uint256) */
export const Finalized = event(
  "0x069cb9cf3066619f9a83be465993a22843ea7baba731ac97ac208899985dc007",
  {
    tokenId: indexed(uint256),
    pollId: indexed(uint256),
    burned: uint256,
  },
);
export type FinalizedEventArgs = EParams<typeof Finalized>;

/** Initialized(uint64) */
export const Initialized = event(
  "0xc7f505b2f371ae2175ee4913f4499e1f2633a7b5936321eed1cdaeb6115181d2",
  {
    version: uint64,
  },
);
export type InitializedEventArgs = EParams<typeof Initialized>;

/** PollCreated(uint256,uint256) */
export const PollCreated = event(
  "0x79fb617314647013123901234cea859ab2df200423a4048a35d9cf59437a9b64",
  {
    tokenId: uint256,
    pollId: uint256,
  },
);
export type PollCreatedEventArgs = EParams<typeof PollCreated>;

/** Revealed(uint256,uint256,uint256,uint256) */
export const Revealed = event(
  "0xa02957988806bd9d30dcd2845b047aa4f45bede519fbd15ebafe428505b0900f",
  {
    tokenId: indexed(uint256),
    pollId: indexed(uint256),
    revealedVotes: uint256,
    remainingVotes: uint256,
  },
);
export type RevealedEventArgs = EParams<typeof Revealed>;

/** RoleAdminChanged(bytes32,bytes32,bytes32) */
export const RoleAdminChanged = event(
  "0xbd79b86ffe0ab8e8776151514217cd7cacd52c909f66475c3af44e129f0b00ff",
  {
    role: indexed(bytes32),
    previousAdminRole: indexed(bytes32),
    newAdminRole: indexed(bytes32),
  },
);
export type RoleAdminChangedEventArgs = EParams<typeof RoleAdminChanged>;

/** RoleGranted(bytes32,address,address) */
export const RoleGranted = event(
  "0x2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d",
  {
    role: indexed(bytes32),
    account: indexed(address),
    sender: indexed(address),
  },
);
export type RoleGrantedEventArgs = EParams<typeof RoleGranted>;

/** RoleRevoked(bytes32,address,address) */
export const RoleRevoked = event(
  "0xf6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b",
  {
    role: indexed(bytes32),
    account: indexed(address),
    sender: indexed(address),
  },
);
export type RoleRevokedEventArgs = EParams<typeof RoleRevoked>;

/** Upgraded(address) */
export const Upgraded = event(
  "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b",
  {
    implementation: indexed(address),
  },
);
export type UpgradedEventArgs = EParams<typeof Upgraded>;

/** Voted(uint256,uint256,address,uint256,bytes32) */
export const Voted = event(
  "0x0f066129e5902e103e22209fff5d12a79f07dc9ef7c78fe10ff64c741a20c8ec",
  {
    tokenId: indexed(uint256),
    pollId: indexed(uint256),
    voter: address,
    tokenAmount: uint256,
    hash: bytes32,
  },
);
export type VotedEventArgs = EParams<typeof Voted>;
