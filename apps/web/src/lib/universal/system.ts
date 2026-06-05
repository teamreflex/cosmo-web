export type SystemStatus = "down" | "degraded" | "normal";

export type MetadataStatus = "operational" | "down";

export type BlockResponse = {
  jsonrpc: string;
  id: number;
  result: { timestamp: string };
};
