import { Cookies, HttpBody } from "@effect/platform";
import { Effect } from "effect";
import { AuthTicketSchema, QueryTicketSchema } from "../schema/qr-auth";
import { cosmoShopClient, decodeBody } from "./http";

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
      .pipe(Effect.flatMap(decodeBody(AuthTicketSchema)), Effect.scoped);
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
    .pipe(Effect.flatMap(decodeBody(QueryTicketSchema)), Effect.scoped);
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
