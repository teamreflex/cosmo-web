export type RevealedVote = {
  pollId: number;
  voter: string;
  comoAmount: number;
  candidateId: number;
  blockNumber: number;
  username: string | undefined;
  hash: string;
};
