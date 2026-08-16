import { Cookies, HttpBody } from "@effect/platform";
import { Effect, Schema } from "effect";
import { cosmoShopClient, decodeBody } from "./http";

const AuthTicketSchema = Schema.Struct({
  expireAt: Schema.String,
  ticket: Schema.String,
});

const ProfileImageSchema = Schema.Struct({
  artistName: Schema.String,
  profileImageUrl: Schema.String,
});

const loadedTicketFields = <T extends string>(status: T) => ({
  status: Schema.Literal(status),
  ticketRemainingMs: Schema.Number,
  ticketOtpRemainingMs: Schema.Number,
  profiles: Schema.mutable(Schema.Array(ProfileImageSchema)),
  user: Schema.Struct({
    id: Schema.Number,
    nickname: Schema.String,
    profileImageUrl: Schema.String,
    profileImages: Schema.mutable(Schema.Array(ProfileImageSchema)),
  }),
});

const QueryTicketSchema = Schema.Union(
  Schema.Struct({
    status: Schema.Literal("invalid"),
  }),
  Schema.Struct({
    status: Schema.Literal("wait_for_user_action"),
    ticketRemainingMs: Schema.Number,
  }),
  Schema.Struct(loadedTicketFields("wait_for_certify")),
  Schema.Struct(loadedTicketFields("certified")),
);

export interface CertifyTicketResult {
  status: number;
  cookies: Record<string, string>;
}

/**
 * Exchange a Google reCAPTCHA token for a login ticket.
 */
export const exchangeLoginTicket = Effect.fn("Cosmo.exchangeLoginTicket")(
  function* (recaptchaToken: string) {
    const client = yield* cosmoShopClient;
    return yield* client
      .post("/bff/v3/users/login-by-qr/ticket", {
        body: HttpBody.unsafeJson({
          recaptcha: {
            action: "login",
            token: recaptchaToken,
          },
        }),
      })
      .pipe(
        Effect.flatMap(decodeBody(AuthTicketSchema)),
        Effect.scoped,
      );
  },
);

/**
 * Query the ticket status.
 */
export const queryTicket = Effect.fn("Cosmo.queryTicket")(function* (
  ticket: string,
) {
  const client = yield* cosmoShopClient;
  return yield* client
    .get("/bff/v3/users/login-by-qr/ticket", { urlParams: { ticket } })
    .pipe(
      Effect.flatMap(decodeBody(QueryTicketSchema)),
      Effect.scoped,
    );
});

/**
 * Certify the ticket. Returns the response status and cookies so the caller can extract the granted session.
 */
export const certifyTicket = Effect.fn("Cosmo.certifyTicket")(function* (
  otp: number,
  ticket: string,
) {
  const client = yield* cosmoShopClient;
  return yield* client
    .post("/bff/v3/users/login-by-qr/certify", {
      body: HttpBody.unsafeJson({ otp, ticket }),
    })
    .pipe(
      Effect.map((response): CertifyTicketResult => ({
        status: response.status,
        cookies: Cookies.toRecord(response.cookies),
      })),
      Effect.scoped,
    );
});
