import { Config, Context, Effect, Layer } from "effect";

/**
 * Where chat's tokens come from and who may open a socket: the web app's
 * JWKS, the issuer and audience every token must name, and the web origins
 * allowed to connect.
 */
export class ChatConfig extends Context.Service<ChatConfig>()(
  "chat/ChatConfig",
  {
    make: Effect.gen(function* () {
      return {
        jwksUrl: yield* Config.URL("AUTH_JWKS_URL"),
        issuer: yield* Config.NonEmptyString("AUTH_ISSUER"),
        audience: yield* Config.NonEmptyString("AUTH_AUDIENCE"),
        allowedOrigins: (yield* Config.NonEmptyString("ALLOWED_ORIGINS"))
          .split(",")
          .map((origin) => origin.trim()),
      };
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make);
}
