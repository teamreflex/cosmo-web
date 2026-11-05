import { createMailer } from "@apollo/mail";
import type { Mail, RenderConfig } from "@apollo/mail";
import { Config, Context, Data, Effect, Layer, Option, Redacted } from "effect";

const SEND_TIMEOUT = "30 seconds";

/**
 * The SES sender and link config are read only while `NOTIFICATION_EMAILS`
 * is on, so a process with sending off boots without any mail env.
 */
export class Mailer extends Context.Service<Mailer>()("app/Mailer", {
  make: Effect.gen(function* () {
    // the kill switch for send-notification-emails
    const enabled = yield* Config.Boolean("NOTIFICATION_EMAILS").pipe(
      Config.withDefault(false),
    );
    if (!enabled) return { enabled };

    const endpoint = yield* Config.option(Config.URL("MAIL_SES_ENDPOINT"));
    const baseUrl = yield* Config.URL("BASE_URL");
    const appName = yield* Config.NonEmptyString("APP_NAME");
    // the web app's VITE_CDN_URL, with no trailing slash
    const cdnUrl = yield* Config.NonEmptyString("CDN_URL");
    // what notification emails render with
    const config = {
      appName,
      logoUrl: new URL("/email/logo.png", baseUrl).href,
    } satisfies RenderConfig;
    const mailer = createMailer({
      appName,
      from: yield* Config.NonEmptyString("MAIL_SES_FROM"),
      region: yield* Config.NonEmptyString("MAIL_SES_REGION"),
      accessKeyId: Redacted.value(
        yield* Config.Redacted("MAIL_SES_ACCESS_KEY"),
      ),
      secretAccessKey: Redacted.value(
        yield* Config.Redacted("MAIL_SES_SECRET_KEY"),
      ),
      endpoint: Option.getOrUndefined(Option.map(endpoint, (url) => url.href)),
    });

    /**
     * An absolute link into the web app, for buttons in emails.
     */
    const appUrl = (path: string) => new URL(path, baseUrl).href;

    /**
     * Sends one mail through SES, in the layout shared with the web app. An
     * unreachable endpoint can leave the request hanging with no error, so it
     * is aborted after SEND_TIMEOUT and counts as refused.
     */
    const send = (mail: Mail) =>
      Effect.tryPromise({
        try: (abortSignal) => mailer.send(mail, { abortSignal }),
        catch: (cause) => new SendMailError({ cause }),
      }).pipe(
        Effect.timeoutOrElse({
          duration: SEND_TIMEOUT,
          orElse: () =>
            Effect.fail(
              new SendMailError({
                cause: `no response from SES in ${SEND_TIMEOUT}`,
              }),
            ),
        }),
      );

    return { enabled, config, appUrl, cdnUrl, send };
  }),
}) {
  static readonly layer = Layer.effect(this, this.make);
}

/**
 * SES refused or never received a mail.
 */
export class SendMailError extends Data.TaggedError("SendMailError")<{
  readonly cause: unknown;
}> {}
