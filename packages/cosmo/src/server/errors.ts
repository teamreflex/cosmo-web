/**
 * HTTP failure from the COSMO API. `status` is undefined for network-level
 * failures where no response was received.
 */
export class CosmoApiError extends Error {
  readonly status: number | undefined;

  constructor(
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "CosmoApiError";
    this.status = options.status;
  }
}

/**
 * COSMO responded successfully but the body did not match the expected schema.
 */
export class CosmoDecodeError extends Error {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "CosmoDecodeError";
  }
}
