import { env } from "./env";
import { Proxy } from "./proxy";
import { Recorder } from "./recorder";
import { buildServer } from "./server";

if (env.MODE === "replay") {
  console.error("[archive] replay mode not implemented in phase 1");
  process.exit(1);
}

const recorder = new Recorder(env.DATA_DIR);
await recorder.init();

const externalBaseUrl = env.EXTERNAL_BASE_URL ?? `http://localhost:${env.PORT}`;
const proxy = new Proxy(recorder, externalBaseUrl);
const server = buildServer(proxy);

console.log(
  `[archive] listening on http://${server.hostname}:${server.port} (mode=${env.MODE}, upstream=${env.UPSTREAM_URL})`,
);

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[archive] received ${signal}, shutting down`);
  await server.stop();
  await proxy.drain();
  await recorder.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
