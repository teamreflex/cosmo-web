import { isBanActive } from "@apollo/auth/guard";
import {
  ChatUnavailable,
  SessionEnded,
  TokenExpired,
  Unauthorized,
} from "@apollo/chat/errors";
import { ChatAuth, CurrentUser } from "@apollo/chat/protocol";
import { Clock, Context, Effect, Layer, Schema } from "effect";
import { SecureRandom, Signature } from "effect/crypto";
import { FetchHttpClient } from "effect/http";
import { type JoseError, Jwks, Jwt } from "effect/jose";
import { ChatConfig } from "./config";
import { Disconnects } from "./disconnects";
import { ChatStore } from "./store";

const Claims = Schema.Struct({
  sub: Schema.NonEmptyString,
  sid: Schema.NonEmptyString,
  exp: Schema.Int,
});

// an unreachable key set is ChatUnavailable, never access
function refusal({ reason }: JoseError.JoseError) {
  if (reason._tag === "KeySetUnavailable") {
    return new ChatUnavailable();
  }
  return reason._tag === "ClaimValidationFailed" && reason.reason === "expired"
    ? new TokenExpired()
    : new Unauthorized();
}

/**
 * Verifies the tokens the web app's jwt plugin signs: EdDSA only, the
 * issuer and audience always checked, expiry judged at the Effect Clock's
 * instant, keys resolved from the Jwks service.
 */
export class TokenVerifier extends Context.Service<TokenVerifier>()(
  "chat/TokenVerifier",
  {
    make: Effect.gen(function* () {
      const { issuer, audience } = yield* ChatConfig;
      const context = yield* Effect.context<Jwks.Jwks | Signature.Signature>();
      return {
        verify: Effect.fn("TokenVerifier.verify")(function* (token: string) {
          const { claims } = yield* Jwt.verifyWithKeySet(Claims, token, {
            algorithms: ["EdDSA"],
            issuer,
            audience,
          }).pipe(
            Effect.provideContext(context),
            Effect.catchTags({
              JoseError: (error) => Effect.fail(refusal(error)),
              SchemaError: () => Effect.fail(new Unauthorized()),
            }),
          );
          return claims;
        }),
      };
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(
      Signature.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto)),
    ),
  );

  /**
   * The JWKS from AUTH_JWKS_URL only, never from the token's issuer or
   * headers. Redirects are refused, so the keys come from that URL alone.
   */
  static readonly layerRemote = this.layer.pipe(
    Layer.provide(
      Layer.unwrap(
        Effect.gen(function* () {
          const { jwksUrl } = yield* ChatConfig;
          return Jwks.layerRemote({ url: jwksUrl.href });
        }),
      ),
    ),
    Layer.provide(
      FetchHttpClient.layer.pipe(
        Layer.provide(
          Layer.succeed(FetchHttpClient.RequestInit, { redirect: "manual" }),
        ),
      ),
    ),
  );
}

const BEARER = /^Bearer (\S+)$/;

/**
 * Every call authenticates on its own: the bearer token is verified, the
 * user's disconnects are watched (before the session read, so none is
 * missed), and the session, ban and role are read from the database. The
 * call then runs as CurrentUser until it ends, its token expires
 * (TokenExpired) or the user is disconnected (SessionEnded); for a Join
 * that is the whole stream.
 */
export const ChatAuthLive = Layer.effect(
  ChatAuth,
  Effect.gen(function* () {
    const verifier = yield* TokenVerifier;
    const store = yield* ChatStore;
    const disconnects = yield* Disconnects;

    return ChatAuth.of((effect, { headers }) =>
      Effect.gen(function* () {
        const token = BEARER.exec(headers.authorization ?? "")?.[1];
        if (token === undefined) {
          return yield* new Unauthorized();
        }
        const claims = yield* verifier.verify(token);
        const disconnected = yield* disconnects.watch(claims.sub);

        const found = yield* store
          .session(claims.sid)
          .pipe(Effect.mapError(() => new ChatUnavailable()));
        const now = yield* Clock.currentTimeMillis;
        if (
          found === null ||
          found.userId !== claims.sub ||
          found.expiresAt.getTime() <= now
        ) {
          return yield* new SessionEnded();
        }
        if (
          found.impersonatedBy !== null ||
          isBanActive(found, new Date(now))
        ) {
          return yield* new Unauthorized();
        }

        return yield* effect.pipe(
          Effect.provideService(CurrentUser, {
            userId: claims.sub,
            sessionId: claims.sid,
            role: found.role,
          }),
          Effect.raceFirst(
            disconnected.pipe(Effect.andThen(Effect.fail(new SessionEnded()))),
          ),
          Effect.raceFirst(
            Effect.sleep(claims.exp * 1000 - now).pipe(
              Effect.andThen(Effect.fail(new TokenExpired())),
            ),
          ),
        );
      }).pipe(Effect.scoped),
    );
  }),
);
