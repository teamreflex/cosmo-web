import { address, bool, bytes32, uint256, uint64 } from "@subsquid/evm-codec";
import { event, indexed } from "../abi.support.js";
import type { EventParams as EParams } from "../abi.support.js";

/** Approval(address,address,uint256) */
export const Approval = event(
  "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
  {
    owner: indexed(address),
    approved: indexed(address),
    tokenId: indexed(uint256),
  },
);
export type ApprovalEventArgs = EParams<typeof Approval>;

/** ApprovalForAll(address,address,bool) */
export const ApprovalForAll = event(
  "0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31",
  {
    owner: indexed(address),
    operator: indexed(address),
    approved: bool,
  },
);
export type ApprovalForAllEventArgs = EParams<typeof ApprovalForAll>;

/** Initialized(uint64) */
export const Initialized = event(
  "0xc7f505b2f371ae2175ee4913f4499e1f2633a7b5936321eed1cdaeb6115181d2",
  {
    version: uint64,
  },
);
export type InitializedEventArgs = EParams<typeof Initialized>;

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

/** Transfer(address,address,uint256) */
export const Transfer = event(
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  {
    from: indexed(address),
    to: indexed(address),
    tokenId: indexed(uint256),
  },
);
export type TransferEventArgs = EParams<typeof Transfer>;

/** Upgraded(address) */
export const Upgraded = event(
  "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b",
  {
    implementation: indexed(address),
  },
);
export type UpgradedEventArgs = EParams<typeof Upgraded>;
