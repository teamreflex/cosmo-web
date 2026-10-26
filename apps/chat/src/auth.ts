import { isBanActive } from "@apollo/auth/guard";
import {
  ChatUnavailable,
  SessionEnded,
  TokenExpired,
  Unauthorized,
} from "@apollo/chat/errors";
import { ChatAuth, CurrentUser } from "@apollo/chat/protocol";
import { Clock, Context, Effect, Layer, Option, Schema } from "effect";
import {
  createRemoteJWKSet,
  errors,
  type JWTVerifyGetKey,
  jwtVerify,
} from "jose";
import { ChatConfig } from "./config";
import { Disconnects } from "./disconnects";
import { ChatStore } from "./store";

const Claims = Schema.Struct({
  sub: Schema.NonEmptyString,
  sid: Schema.NonEmptyString,
  exp: Schema.Int,
});

const decodeClaims = Schema.decodeUnknownOption(Claims);

/**
 * Verifies the tokens the web app's jwt plugin signs: EdDSA only, the
 * issuer and audience always checked, expiry judged at the Effect Clock's
 * instant. A JWKS that can't be reached is ChatUnavailable, never access.
 */
export class TokenVerifier extends Context.Service<TokenVerifier>()(
  "chat/TokenVerifier",
  {
    make: (keys: JWTVerifyGetKey) =>
      Effect.gen(function* () {
        const { issuer, audience } = yield* ChatConfig;
        return {
          verify: Effect.fn("TokenVerifier.verify")(function* (token: string) {
            const now = yield* Clock.currentTimeMillis;
            const { payload } = yield* Effect.tryPromise({
              try: () =>
                jwtVerify(token, keys, {
                  algorithms: ["EdDSA"],
                  issuer,
                  audience,
                  currentDate: new Date(now),
                }),
              catch: (error) => {
                if (error instanceof errors.JWTExpired) {
                  return new TokenExpired();
                }
                return error instanceof errors.JOSEError &&
                  !(error instanceof errors.JWKSTimeout)
                  ? new Unauthorized()
                  : new ChatUnavailable();
              },
            });
            const claims = decodeClaims(payload);
            if (Option.isNone(claims)) {
              return yield* new Unauthorized();
            }
            return claims.value;
          }),
        };
      }),
  },
) {
  // the JWKS from AUTH_JWKS_URL only, never from the token's issuer or headers
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const { jwksUrl } = yield* ChatConfig;
      return yield* TokenVerifier.make(createRemoteJWKSet(jwksUrl));
    }),
  );

  static readonly layerWith = (keys: JWTVerifyGetKey) =>
    Layer.effect(this, this.make(keys));
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
