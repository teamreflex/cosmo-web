export type SystemStatus = "down" | "degraded" | "normal";

export type MetadataStatus = "operational" | "down";

export type RPCResponse = {
  jsonrpc: string;
  id: number;
  result: string;
};
