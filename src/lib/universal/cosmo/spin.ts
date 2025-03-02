import { ObjektBaseFields } from "./objekts";

export type CosmoSpinGetTickets = {
  availableTicketsCount: number;
  nextReceiveAt: string | null;
};

export type CosmoSpinStatistic = {
  type: string; // class name
  count: number;
};

export type CosmoSpinStatisticsResponse = {
  items: CosmoSpinStatistic[];
};

export type CosmoSpinClassRate = {
  type: string;
  rate: string;
};

export type CosmoSpinSeasonRate = {
  title: string;
  order: number;
  rates: CosmoSpinClassRate[];
};

export type CosmoSpinPresignRequest = {
  usedTokenId: number;
};

export type CosmoSpinPresignResponse = {
  spinId: number;
};

export type CosmoSpinCompleteRequest = {
  index: number;
  spinId: number;
};

export type CosmoSpinCompleteResponse = (ObjektBaseFields | null)[];
