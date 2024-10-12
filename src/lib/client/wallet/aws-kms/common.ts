export class UnknownWalletVersion extends Error {
  constructor() {
    super("Unknown wallet version");
  }
}

export class UnknownRegion extends Error {}
