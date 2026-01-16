export type SystemStatus = "down" | "degraded" | "normal";

export type RPCResponse = {
  jsonrpc: string;
  id: number;
  result: string;
};
