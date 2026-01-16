export type RevealedVote = {
  pollId: number;
  voter: string;
  comoAmount: number;
  candidateId: number;
  blockNumber: number;
  username: string | undefined;
  hash: string;
};

export type AggregatedVotes = {
  candidates: Record<
    number,
    {
      comoAmount: number;
      id: number;
      title: string;
      imageUrl: string;
    }
  >;
  address: string;
  nickname: string | undefined;
  total: number;
};
