import { ActionResultError } from "./types";

export class AuthenticatedActionError extends Error {
  constructor(public result: ActionResultError) {
    super(result.error);
    this.name = "AuthenticatedActionError";
  }
}
