import type { FileSink } from "bun";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ProxyRecord } from "./record-types";

// Append-only JSONL writer with per-UTC-date rotation. Appends are serialized
// through a single Promise chain so concurrent requests don't interleave bytes
// mid-line.
export class Recorder {
  #dataDir: string;
  #currentDate: string | null = null;
  #writer: FileSink | null = null;
  #queue: Promise<void> = Promise.resolve();
  #closed = false;

  constructor(dataDir: string) {
    this.#dataDir = dataDir;
  }

  async init(): Promise<void> {
    await mkdir(this.#dataDir, { recursive: true });
  }

  record(record: ProxyRecord): void {
    if (this.#closed) return;
    this.#queue = this.#queue
      .then(() => this.#append(record))
      .catch((err: unknown) => {
        console.error("[archive] recorder append failed:", err);
      });
  }

  async #append(record: ProxyRecord): Promise<void> {
    const date = record.ts.slice(0, 10);
    if (this.#writer === null || date !== this.#currentDate) {
      if (this.#writer !== null) await this.#writer.end();
      const path = join(this.#dataDir, `${date}.jsonl`);
      this.#writer = Bun.file(path).writer();
      this.#currentDate = date;
    }
    void this.#writer.write(`${JSON.stringify(record)}\n`);
    await this.#writer.flush();
  }

  async close(): Promise<void> {
    this.#closed = true;
    await this.#queue;
    if (this.#writer !== null) {
      await this.#writer.end();
      this.#writer = null;
    }
  }
}
