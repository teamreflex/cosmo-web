import { describe, expect, it } from "bun:test";
import {
  certifyTicket,
  exchangeLoginTicket,
  queryTicket,
} from "../src/server/qr-auth";
import { authTicket, waitingTicket } from "./fixtures";
import { handle, recorder, runTest } from "./test-client";

describe("exchangeLoginTicket", () => {
  it("posts the recaptcha token with shop headers", async () => {
    const rec = recorder();
    handle.post(
      "https://shop.cosmo.fans/bff/v3/users/login-by-qr/ticket",
      (request) => {
        rec.record(request);
        return Response.json(authTicket);
      },
    );

    const result = await runTest(exchangeLoginTicket("recaptcha-token"));

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
    handle.get(
      "https://shop.cosmo.fans/bff/v3/users/login-by-qr/ticket",
      (request) => {
        rec.record(request);
        return Response.json(waitingTicket);
      },
    );

    const result = await runTest(queryTicket("ticket-value"));

    expect(result).toEqual(waitingTicket);
    expect(rec.at(0).url.searchParams.get("ticket")).toBe("ticket-value");
  });
});

describe("certifyTicket", () => {
  it("posts the otp and returns the status and cookies", async () => {
    const rec = recorder();
    handle.post(
      "https://shop.cosmo.fans/bff/v3/users/login-by-qr/certify",
      (request) => {
        rec.record(request);
        return new Response(null, {
          status: 200,
          headers: { "set-cookie": "user-session=session-abc; Path=/" },
        });
      },
    );

    const response = await runTest(certifyTicket(123456, "ticket-value"));

    expect(response.status).toBe(200);
    expect(response.cookies["user-session"]).toBe("session-abc");
    expect(JSON.parse(rec.at(0).body)).toEqual({
      otp: 123456,
      ticket: "ticket-value",
    });
  });

  it("rejects when certification fails", async () => {
    handle.post(
      "https://shop.cosmo.fans/bff/v3/users/login-by-qr/certify",
      () => Response.json({ message: "invalid otp" }, { status: 400 }),
    );

    expect(
      runTest(certifyTicket(123456, "ticket-value")),
    ).rejects.toMatchObject({
      status: 400,
    });
  });
});
