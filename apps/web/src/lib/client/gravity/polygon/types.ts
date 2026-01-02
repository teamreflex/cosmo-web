export type VoteLog = {
  pollId: bigint;
  voteIndex: bigint;
  voter: string;
  comoAmount: bigint;
  hash: string;
  blockNumber: number;
};

export type RevealLog = {
  pollId: bigint;
  voteIndex: bigint;
  candidateId: bigint;
};
