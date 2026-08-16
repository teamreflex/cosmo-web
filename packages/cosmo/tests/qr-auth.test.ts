import { describe, expect, it } from "bun:test";
import { http, HttpResponse } from "msw";
import { runCosmo } from "../src/runtime";
import {
  certifyTicket,
  exchangeLoginTicket,
  queryTicket,
} from "../src/server/qr-auth";
import { authTicket, waitingTicket } from "./fixtures";
import { recorder, server } from "./server";

describe("exchangeLoginTicket", () => {
  it("posts the recaptcha token with shop headers", async () => {
    const rec = recorder();
    server.use(
      http.post(
        "https://shop.cosmo.fans/bff/v3/users/login-by-qr/ticket",
        async ({ request }) => {
          await rec.record(request);
          return HttpResponse.json(authTicket);
        },
      ),
    );

    const result = await runCosmo(exchangeLoginTicket("recaptcha-token"));

    expect(result).toEqual(authTicket);
    const request = rec.at(0);
    expect(request.headers.get("origin")).toBe("https://shop.cosmo.fans");
    expect(request.headers.get("user-agent")).toBe(
      "apollo.cafe (github.com/teamreflex/cosmo-web)",
    );
    expect(JSON.parse(request.body)).toEqual({
      recaptcha: { action: "login", token: "recaptcha-token" },
    });
  });
});

describe("queryTicket", () => {
  it("queries the ticket status", async () => {
    const rec = recorder();
    server.use(
      http.get(
        "https://shop.cosmo.fans/bff/v3/users/login-by-qr/ticket",
        async ({ request }) => {
          await rec.record(request);
          return HttpResponse.json(waitingTicket);
        },
      ),
    );

    const result = await runCosmo(queryTicket("ticket-value"));

    expect(result).toEqual(waitingTicket);
    expect(rec.at(0).url.searchParams.get("ticket")).toBe("ticket-value");
  });
});

describe("certifyTicket", () => {
  it("posts the otp and returns the status and cookies", async () => {
    const rec = recorder();
    server.use(
      http.post(
        "https://shop.cosmo.fans/bff/v3/users/login-by-qr/certify",
        async ({ request }) => {
          await rec.record(request);
          return new HttpResponse(null, {
            status: 200,
            headers: { "set-cookie": "user-session=session-abc; Path=/" },
          });
        },
      ),
    );

    const response = await runCosmo(certifyTicket(123456, "ticket-value"));

    expect(response.status).toBe(200);
    expect(response.cookies["user-session"]).toBe("session-abc");
    expect(JSON.parse(rec.at(0).body)).toEqual({
      otp: 123456,
      ticket: "ticket-value",
    });
  });

  it("rejects when certification fails", async () => {
    server.use(
      http.post(
        "https://shop.cosmo.fans/bff/v3/users/login-by-qr/certify",
        () => HttpResponse.json({ message: "invalid otp" }, { status: 400 }),
      ),
    );

    expect(
      runCosmo(certifyTicket(123456, "ticket-value")),
    ).rejects.toMatchObject({
      status: 400,
    });
  });
});
