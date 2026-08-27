import { ContractBase } from "../abi.support.js";
import {
  DEFAULT_ADMIN_ROLE,
  ERROR_ALL_VOTES_REVEALED,
  ERROR_EMPTY_CALLDATA,
  ERROR_INSUFFICIENT_TOKEN_AMOUNT,
  ERROR_INVALID_CANDIDATES_LENGTH,
  ERROR_INVALID_DATA_LENGTH,
  ERROR_INVALID_DUE,
  ERROR_INVALID_FROM_ADDRESS,
  ERROR_INVALID_MINIMUM_TOKEN,
  ERROR_INVALID_OFFSET,
  ERROR_INVALID_REVEAL_DATA,
  ERROR_INVALID_START_AT,
  ERROR_INVALID_TOKEN_UNIT,
  ERROR_INVALID_VOTE_SIGNER_ADDRESS,
  ERROR_INVALID_VOTE_UNIT,
  ERROR_NOT_ALL_VOTES_REVEALED,
  ERROR_NOT_IN_PROGRESS,
  ERROR_POLL_ALREADY_EXISTS,
  ERROR_POLL_ALREADY_FINALIZED,
  ERROR_POLL_NOT_EXISTS,
  ERROR_VOTE_HASH_CANNOT_BE_REPLAYED,
  ERROR_VOTE_SIGNER_INVALID_SIGNATURE,
  OPERATOR_ROLE,
  UPGRADE_INTERFACE_VERSION,
  candidates,
  eip712Domain,
  getRoleAdmin,
  hasRole,
  onERC1155BatchReceived,
  onERC1155Received,
  proxiableUUID,
  remainingVotesCount,
  supportsInterface,
  totalVotesCount,
  voteSignerAddress,
  votesPerCandidates,
} from "./functions.js";
import type {
  CandidatesParams,
  GetRoleAdminParams,
  HasRoleParams,
  OnERC1155BatchReceivedParams,
  OnERC1155ReceivedParams,
  RemainingVotesCountParams,
  SupportsInterfaceParams,
  TotalVotesCountParams,
  VotesPerCandidatesParams,
} from "./functions.js";

export class Contract extends ContractBase {
  DEFAULT_ADMIN_ROLE() {
    return this.eth_call(DEFAULT_ADMIN_ROLE, {});
  }

  ERROR_ALL_VOTES_REVEALED() {
    return this.eth_call(ERROR_ALL_VOTES_REVEALED, {});
  }

  ERROR_EMPTY_CALLDATA() {
    return this.eth_call(ERROR_EMPTY_CALLDATA, {});
  }

  ERROR_INSUFFICIENT_TOKEN_AMOUNT() {
    return this.eth_call(ERROR_INSUFFICIENT_TOKEN_AMOUNT, {});
  }

  ERROR_INVALID_CANDIDATES_LENGTH() {
    return this.eth_call(ERROR_INVALID_CANDIDATES_LENGTH, {});
  }

  ERROR_INVALID_DATA_LENGTH() {
    return this.eth_call(ERROR_INVALID_DATA_LENGTH, {});
  }

  ERROR_INVALID_DUE() {
    return this.eth_call(ERROR_INVALID_DUE, {});
  }

  ERROR_INVALID_FROM_ADDRESS() {
    return this.eth_call(ERROR_INVALID_FROM_ADDRESS, {});
  }

  ERROR_INVALID_MINIMUM_TOKEN() {
    return this.eth_call(ERROR_INVALID_MINIMUM_TOKEN, {});
  }

  ERROR_INVALID_OFFSET() {
    return this.eth_call(ERROR_INVALID_OFFSET, {});
  }

  ERROR_INVALID_REVEAL_DATA() {
    return this.eth_call(ERROR_INVALID_REVEAL_DATA, {});
  }

  ERROR_INVALID_START_AT() {
    return this.eth_call(ERROR_INVALID_START_AT, {});
  }

  ERROR_INVALID_TOKEN_UNIT() {
    return this.eth_call(ERROR_INVALID_TOKEN_UNIT, {});
  }

  ERROR_INVALID_VOTE_SIGNER_ADDRESS() {
    return this.eth_call(ERROR_INVALID_VOTE_SIGNER_ADDRESS, {});
  }

  ERROR_INVALID_VOTE_UNIT() {
    return this.eth_call(ERROR_INVALID_VOTE_UNIT, {});
  }

  ERROR_NOT_ALL_VOTES_REVEALED() {
    return this.eth_call(ERROR_NOT_ALL_VOTES_REVEALED, {});
  }

  ERROR_NOT_IN_PROGRESS() {
    return this.eth_call(ERROR_NOT_IN_PROGRESS, {});
  }

  ERROR_POLL_ALREADY_EXISTS() {
    return this.eth_call(ERROR_POLL_ALREADY_EXISTS, {});
  }

  ERROR_POLL_ALREADY_FINALIZED() {
    return this.eth_call(ERROR_POLL_ALREADY_FINALIZED, {});
  }

  ERROR_POLL_NOT_EXISTS() {
    return this.eth_call(ERROR_POLL_NOT_EXISTS, {});
  }

  ERROR_VOTE_HASH_CANNOT_BE_REPLAYED() {
    return this.eth_call(ERROR_VOTE_HASH_CANNOT_BE_REPLAYED, {});
  }

  ERROR_VOTE_SIGNER_INVALID_SIGNATURE() {
    return this.eth_call(ERROR_VOTE_SIGNER_INVALID_SIGNATURE, {});
  }

  OPERATOR_ROLE() {
    return this.eth_call(OPERATOR_ROLE, {});
  }

  UPGRADE_INTERFACE_VERSION() {
    return this.eth_call(UPGRADE_INTERFACE_VERSION, {});
  }

  candidates(
    tokenId: CandidatesParams["tokenId"],
    pollId: CandidatesParams["pollId"],
  ) {
    return this.eth_call(candidates, { tokenId, pollId });
  }

  eip712Domain() {
    return this.eth_call(eip712Domain, {});
  }

  getRoleAdmin(role: GetRoleAdminParams["role"]) {
    return this.eth_call(getRoleAdmin, { role });
  }

  hasRole(role: HasRoleParams["role"], account: HasRoleParams["account"]) {
    return this.eth_call(hasRole, { role, account });
  }

  onERC1155BatchReceived(
    operator: OnERC1155BatchReceivedParams["operator"],
    from: OnERC1155BatchReceivedParams["from"],
    tokenIds: OnERC1155BatchReceivedParams["tokenIds"],
    values: OnERC1155BatchReceivedParams["values"],
    data: OnERC1155BatchReceivedParams["data"],
  ) {
    return this.eth_call(onERC1155BatchReceived, {
      operator,
      from,
      tokenIds,
      values,
      data,
    });
  }

  onERC1155Received(
    operator: OnERC1155ReceivedParams["operator"],
    from: OnERC1155ReceivedParams["from"],
    tokenId: OnERC1155ReceivedParams["tokenId"],
    amount: OnERC1155ReceivedParams["amount"],
    data: OnERC1155ReceivedParams["data"],
  ) {
    return this.eth_call(onERC1155Received, {
      operator,
      from,
      tokenId,
      amount,
      data,
    });
  }

  proxiableUUID() {
    return this.eth_call(proxiableUUID, {});
  }

  remainingVotesCount(
    tokenId: RemainingVotesCountParams["tokenId"],
    pollId: RemainingVotesCountParams["pollId"],
  ) {
    return this.eth_call(remainingVotesCount, { tokenId, pollId });
  }

  supportsInterface(interfaceId: SupportsInterfaceParams["interfaceId"]) {
    return this.eth_call(supportsInterface, { interfaceId });
  }

  totalVotesCount(
    tokenId: TotalVotesCountParams["tokenId"],
    pollId: TotalVotesCountParams["pollId"],
  ) {
    return this.eth_call(totalVotesCount, { tokenId, pollId });
  }

  voteSignerAddress() {
    return this.eth_call(voteSignerAddress, {});
  }

  votesPerCandidates(
    tokenId: VotesPerCandidatesParams["tokenId"],
    pollId: VotesPerCandidatesParams["pollId"],
  ) {
    return this.eth_call(votesPerCandidates, { tokenId, pollId });
  }
}
