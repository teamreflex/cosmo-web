import { ActionResultError } from "./types";

export class ActionError extends Error {
  constructor(public result: ActionResultError) {
    super(result.error);
    this.name = "ActionError";
  }
}
